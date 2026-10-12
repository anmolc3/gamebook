@echo off
setlocal
if exist "C:\Program Files\Eclipse Adoptium\jdk-17.0.14.7-hotspot\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.14.7-hotspot"
) else (
    for /d %%i in ("C:\Program Files\Eclipse Adoptium\jdk-17*") do (
        if exist "%%i\bin\java.exe" set "JAVA_HOME=%%i"
    )
)
if not exist "%JAVA_HOME%\bin\java.exe" (
    if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    )
)
if not exist "%ANDROID_HOME%\platform-tools\adb.exe" (
    if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
        set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    )
)
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

cd /d "%~dp0android"
echo =======================================================
echo   Starting Local Android APK Build
echo   JAVA_HOME:    %JAVA_HOME%
echo   ANDROID_HOME: %ANDROID_HOME%
echo =======================================================

call gradlew.bat --stop
call gradlew.bat assembleRelease %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Release build encountered an error. Trying assembleDebug...
    call gradlew.bat assembleDebug %*
)

echo.
echo Check outputs in:
echo   %~dp0android\app\build\outputs\apk\
endlocal
