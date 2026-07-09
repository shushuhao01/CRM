package com.xianhu.crm.callscreen;

import android.os.Build;

import io.dcloud.feature.uniapp.annotation.UniJSMethod;
import io.dcloud.feature.uniapp.common.UniModule;

/**
 * 极简 UniModule 模块。
 *
 * 存在的主要目的：uni-app 本地插件的 package.json 要求
 * _dp_nativeplugin.android.plugins 下至少声明一个有效插件对象，
 * 否则 HBuilderX 打包校验报"不合法"。
 *
 * JS 侧主通道仍是 plus.android（SharedPreferences + 应用内广播 + RoleManager），
 * 本模块只提供两个无参同步方法作为可选的备用查询入口，
 * 不持有 Context、不依赖 JSON/回调类，二进制兼容面最小。
 */
public class CallScreeningModule extends UniModule {

    /** 系统是否支持来电筛选角色（Android 10+），返回 "1"/"0" */
    @UniJSMethod(uiThread = false)
    public String isScreeningSupported() {
        return Build.VERSION.SDK_INT >= 29 ? "1" : "0";
    }

    /** 最近一次响铃前捕获的来电，格式 "号码|毫秒时间戳"，无数据返回空串 */
    @UniJSMethod(uiThread = false)
    public String getLastScreenedCall() {
        String number = CRMCallScreeningService.sLastNumber;
        long time = CRMCallScreeningService.sLastTime;
        if (number == null || number.isEmpty() || time <= 0) {
            return "";
        }
        return number + "|" + time;
    }
}
