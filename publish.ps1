[CmdletBinding()]
Param(
  [Parameter(Mandatory=$False, HelpMessage="Only applies when bigformmenu npm package is published. If used, increases the minor version instead of the patch version")]
  [switch]$BumpMinor,

  [Parameter(Mandatory=$False, HelpMessage="Generates everything, including JSNLog and website.")]
  [switch]$GenerateEverything,

  [Parameter(Mandatory=$False, HelpMessage="Generates the npm package.")]
  [switch]$GenerateNpmPackage,

  [Parameter(Mandatory=$False, HelpMessage="Only goes through templated files to update __Version__.")]
  [switch]$UpdateVersions,

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

function Generate-NpmPackage($publishing, $version)
{
}

$packageJsonPath = "$PSScriptRoot\package.json"
$bumpPackageVersion = $Publish -and ($GenerateNpmPackage -or $GenerateEverything)

$bumpPatch = (-not $BumpMinor) -and $bumpPackageVersion
$bumpMinor = $BumpMinor -and $bumpPackageVersion

$version = GetAndUpdatePackageVersion $packageJsonPath $bumpPatch $bumpMinor


if ($GenerateNpmPackage -or $GenerateEverything -or $UpdateVersions)
{
	ProcessTemplates $version
}

if ($GenerateNpmPackage -or $GenerateEverything) 
{
	Generate-NpmPackage $Publish $version
}
