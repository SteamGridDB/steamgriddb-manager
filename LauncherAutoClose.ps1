# This script is used to auto-close launchers that don't have an auto-close setting.


param (
    [Parameter(Mandatory=$True)][string]$launchcmd,    # Command to launch game
    [Parameter(Mandatory=$True)][string]$launcher,     # Launcher to kill
    [Parameter(Mandatory=$True)][string[]]$game,       # Game(s) to watch

    [Parameter(Mandatory=$False)][bool]$bnet = $False, # Use Battle.net-specific launch method
    [Parameter(Mandatory=$False)][string]$bnetpath,    # Battle.net executable
    [Parameter(Mandatory=$False)][string]$bnetlaunchid # Battle.net launch ID
)

$scriptPath = Split-Path -parent $MyInvocation.MyCommand.Definition

function Wait-ProcessChildren($id) {
    $child = Get-WmiObject win32_process | where {$_.ParentProcessId -In $id}
    if ($child) {
        Write-Host 'Child found'
        Wait-Process -Id $child.handle
        Wait-ProcessChildren $child.handle
    }
}

# Kill launcher
Write-Host 'Killing launcher'
Get-Process $launcher -ErrorAction SilentlyContinue | Stop-Process

# Start Game
If ($bnet) {
    & "$scriptPath\BnetHelper.ps1" -bnet $bnetpath -launchid $bnetlaunchid
} Else {
    Start-Process $launchcmd
}

$gameStarted = $False

Write-Host 'Waiting for game to start'

# Get current system date
$currentDate = Get-Date
Do {
    $gameProcess = Get-Process $game -ErrorAction SilentlyContinue

    If (!($gameProcess)) {
        # Timeout after 30 minutes
		If ($currentDate.AddMinutes(30) -lt (Get-Date)) {
			Write-Host 'Game process could not be found'
			exit
		}
        Start-Sleep -Seconds 1
    } Else {
        Write-Host 'Game started!'
        $gameStarted = $true
    }
} Until ($gameStarted)

# Wait until game closes
Wait-Process -InputObject $gameProcess

# Wait until child processes close
Wait-ProcessChildren $gameProcess.Id

Write-Host 'Game closed'

# Wait for cloud saves or whatever
Start-Sleep -Seconds 5

# Kill launcher
Write-Host 'Killing launcher'
Get-Process $launcher | Stop-Process
