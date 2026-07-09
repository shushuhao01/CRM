package com.xianhu.crm.callscreen;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.telecom.Call;
import android.telecom.CallScreeningService;
import android.util.Log;

/**
 * 来电筛选服务
 *
 * Android 10+ 上，当本 APP 持有 ROLE_CALL_SCREENING（"来电显示与骚扰拦截"）角色时，
 * 系统在响铃前主动回调 onScreenCall(Call.Details)，Details.getHandle() 直接携带来电号码，
 * 不依赖 READ_CALL_LOG 的 AppOps 放行，不受荣耀/OPPO 等 ROM 的通话记录拦截影响。
 *
 * 与 JS 层的通讯（不依赖 uni-app 离线SDK，纯安卓标准API）：
 * 1. SharedPreferences("crm_callscreen")：持久化最近一次来电号码+时间戳，
 *    JS 通过 plus.android 直接读取（进程被杀后重启也能补读）
 * 2. 应用内广播（action = 包名 + ".CALL_SCREENED"，setPackage 限定本应用）：
 *    实时推送号码，JS 通过 plus.android 注册 BroadcastReceiver 接收
 *
 * 安全红线：无论任何分支（包括异常），必须以"允许来电"响应 respondToCall，
 * 否则会影响用户正常接听。所有业务逻辑均在 try 中，respondToCall 在 finally 中兜底。
 */
public class CRMCallScreeningService extends CallScreeningService {

    private static final String TAG = "CRMCallScreening";
    private static final String SP_NAME = "crm_callscreen";
    private static final String SP_KEY_NUMBER = "last_incoming_number";
    private static final String SP_KEY_TIME = "last_incoming_time";
    private static final String SP_KEY_TIME_STR = "last_incoming_time_str";
    /** 广播 action 后缀（完整 action = getPackageName() + ACTION_SUFFIX） */
    private static final String ACTION_SUFFIX = ".CALL_SCREENED";

    /** 进程内静态缓存（供 CallScreeningModule 无 Context 读取） */
    static volatile String sLastNumber = "";
    static volatile long sLastTime = 0L;

    @Override
    public void onScreenCall(Call.Details callDetails) {
        try {
            // 只处理呼入（角色机制为 API 29+，此处直接判断方向）
            if (Build.VERSION.SDK_INT >= 29) {
                if (callDetails.getCallDirection() != Call.Details.DIRECTION_INCOMING) {
                    return;
                }
            }

            String phoneNumber = "";
            Uri handle = callDetails.getHandle();
            if (handle != null && handle.getSchemeSpecificPart() != null) {
                phoneNumber = handle.getSchemeSpecificPart().trim();
            }

            long timestamp = System.currentTimeMillis();
            Log.i(TAG, "onScreenCall: 响铃前获取到来电号码=" + maskNumber(phoneNumber));

            if (phoneNumber.length() >= 3) {
                sLastNumber = phoneNumber;
                sLastTime = timestamp;
                persistToPrefs(phoneNumber, timestamp);
                sendScreenedBroadcast(phoneNumber, timestamp);
            }
        } catch (Throwable t) {
            Log.e(TAG, "onScreenCall 处理异常（来电仍会正常放行）", t);
        } finally {
            // 🔒 必须响应且必须放行：不拦截、不拒接、不跳过通话记录和通知
            try {
                respondToCall(callDetails, new CallResponse.Builder()
                        .setDisallowCall(false)
                        .setRejectCall(false)
                        .setSkipCallLog(false)
                        .setSkipNotification(false)
                        .build());
            } catch (Throwable t) {
                Log.e(TAG, "respondToCall 异常", t);
            }
        }
    }

    /** 持久化到 SharedPreferences：APP 进程被杀后来电，JS 唤醒时可补读 */
    private void persistToPrefs(String number, long time) {
        try {
            SharedPreferences sp = getApplicationContext()
                    .getSharedPreferences(SP_NAME, Context.MODE_PRIVATE);
            sp.edit()
                    .putString(SP_KEY_NUMBER, number)
                    .putLong(SP_KEY_TIME, time)
                    // 同时以字符串存储时间戳，避免 JS 层读取 long 的精度/类型问题
                    .putString(SP_KEY_TIME_STR, String.valueOf(time))
                    .apply();
        } catch (Throwable t) {
            Log.w(TAG, "persistToPrefs 失败", t);
        }
    }

    /** 发送应用内广播，实时推送号码给 JS 层（setPackage 限定本应用，不外泄） */
    private void sendScreenedBroadcast(String number, long time) {
        try {
            Context ctx = getApplicationContext();
            Intent intent = new Intent(ctx.getPackageName() + ACTION_SUFFIX);
            intent.setPackage(ctx.getPackageName());
            intent.putExtra("phoneNumber", number);
            intent.putExtra("timestamp", String.valueOf(time));
            ctx.sendBroadcast(intent);
            Log.i(TAG, "已广播来电号码给应用内接收器");
        } catch (Throwable t) {
            Log.w(TAG, "sendScreenedBroadcast 失败", t);
        }
    }

    /** 日志脱敏：只显示前3后2位 */
    private static String maskNumber(String number) {
        if (number == null || number.length() < 6) return number;
        return number.substring(0, 3) + "****" + number.substring(number.length() - 2);
    }
}
