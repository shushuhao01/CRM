package io.dcloud.feature.uniapp.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 编译期桩注解（stub）—— 仅用于脱离 uni-app 离线SDK 编译插件模块。
 *
 * 注意：本注解【不会】被打进 AAR。注解在 class 文件中按全限定名记录，
 * 运行时反射解析到基座内的真实 UniJSMethod，属性签名与官方一致。
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface UniJSMethod {
    boolean uiThread() default true;
}
