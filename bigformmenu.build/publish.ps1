[CmdletBinding()]
Param(
  [Parameter(Mandatory=$False, HelpMessage="If used, increases the minor version instead of the patch version")]
  [switch]$BumpMinor,

  [Parameter(Mandatory=$False, HelpMessage="Publishes those components that will be generated")]
  [switch]$Publish
)

."..\..\keys.ps1"

Function Log([string] $message)
{
	Write-Host $message
}

Function LogHeading([string] $message)
{
	Write-Host -ForegroundColor Yellow $message
}

Function GetAndUpdatePackageVersion([string] $packageJsonPath, [bool] $bumpPatch, [bool] $bumpMinor)
{
	$fileContent = Get-Content -Raw -Path $packageJsonPath
	$json = $fileContent | ConvertFrom-Json
	$version = $json.version

	if ($bumpPatch -or $bumpMinor)
	{
		$versionComponents = $version.Split('.')

		if ($bumpPatch)
		{
			 $versionComponents[2] = [int]::Parse($versionComponents[2]) + 1
		}

		if ($bumpMinor)
		{
			 $versionComponents[1] = [int]::Parse($versionComponents[1]) + 1
		}

		$version = $versionComponents[0] + '.' + $versionComponents[1] + '.' + $versionComponents[2]
		$json.version = $version

		$newFileContent = $json | ConvertTo-Json
		$newFileContent | Out-File $packageJsonPath
	}

	return $version
}

$packageJsonPath = "$PSScriptRoot\..\package.json"
$bumpPatch = (-not $BumpMinor) -and $Publish
$bumpMinor = $BumpMinor -and $Publish

$version = GetAndUpdatePackageVersion $packageJsonPath $bumpPatch $bumpMinor

Log '--------------------------------------------------------------'
if ($Publish) 
{
	Log "Publishing"
}
Log "Version: $version"
Log '--------------------------------------------------------------'

