# This script is used to auto-close launchers that don't have an auto-close setting.


# $launchcmd = Command to launch game
# $launcher  = Launcher to kill
# $game      = Game(s) to watch

param (
    [Parameter(Mandatory=$true)][string]$launchcmd,
    [Parameter(Mandatory=$true)][string]$launcher,
    [Parameter(Mandatory=$true)][string[]]$game
)

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
Get-Process $launcher | Stop-Process

# Start Game
Start-Process $launchcmd

$gameStarted = $false

Write-Host 'Waiting for game to start'

# Get current system date
$currentDate = Get-Date
Do {
    $gameProcess = Get-Process $game -ErrorAction SilentlyContinue

    If (!($gameProcess)) {
        # Timeout after 30 minutes
		If ($currentDate.AddMinutes(30) -lt (Get-Date))
		{
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
