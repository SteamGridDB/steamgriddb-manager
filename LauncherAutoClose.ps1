# This script is used to auto-close launchers that don't have an auto-close setting.


# $launchcmd = Command to launch game
# $launcher  = Launcher to kill
# $game      = Game(s) to watch

param (
    [Parameter(Mandatory=$true)][string]$launchcmd,
    [Parameter(Mandatory=$true)][string]$launcher,
    [Parameter(Mandatory=$true)][string[]]$game
)


# Kill launcher
Write-Host 'Killing launcher'
Get-Process $launcher | Stop-Process

# Start Game
Start-Process $launchcmd

$gameStarted = $false

Write-Host 'Waiting for game to start'
Do {
    $gameProcess = Get-Process $game -ErrorAction SilentlyContinue

    If (!($gameProcess)) {
        Start-Sleep -Seconds 1
    } Else {
        Write-Host 'Game started!'
        $gameStarted = $true
    }
} Until ($gameStarted)

# Wait until game closes
Wait-Process -InputObject $gameProcess

# Get child processes of game
$gameSubProcesses = Get-WmiObject win32_process | where {$_.ParentProcessId -eq $gameProcess.ID}

# Wait until game child processes close
Wait-Process -Id $gameSubProcesses.handle

# Get child's child processes of game
$gameSubProcessesSubProcesses = Get-WmiObject win32_process | where {$_.ParentProcessId -eq $gameProcesses.handle}

# Wait until child's child processes close
Wait-Process -Id $gameSubProcessesSubProcesses.handle

Write-Host 'Game closed'

# Wait for cloud saves or whatever
Start-Sleep -Seconds 5

# Kill launcher
Write-Host 'Killing launcher'
Get-Process $launcher | Stop-Process
