Set Fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
Set WshEnv = WshShell.Environment("PROCESS")

ScriptDir = Fso.GetParentFolderName(WScript.ScriptFullName)
ServerFile = Fso.BuildPath(ScriptDir, "server.mjs")
ServerUrl = "file:///" & Replace(ServerFile, "\", "/")

LocalAppData = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
OcExe = LocalAppData & "\Programs\ai.opencode.desktop\resources\opencode-cli.exe"

WshShell.CurrentDirectory = ScriptDir
If Fso.FileExists(OcExe) Then
  WshEnv("BUN_BE_BUN") = "1"
  WshShell.Run """" & OcExe & """ -e ""import('" & ServerUrl & "')""", 0, False
Else
  WshShell.Run "node """ & ServerFile & """", 0, False
End If
