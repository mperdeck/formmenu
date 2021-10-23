[CmdletBinding()]
Param(
  [Parameter(Mandatory=$False, HelpMessage="Only applies when formmenu npm package is published. If used, increases the minor version instead of the patch version")]
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

."..\JSNLog\jsnlog.SimpleWorkingDemoGenerator\Generator\Common\Helpers.ps1"


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
			$versionComponents[2] = '0'
		}

		$version = $versionComponents[0] + '.' + $versionComponents[1] + '.' + $versionComponents[2]
		$json.version = $version

		$newFileContent = $json | ConvertTo-Json
		$newFileContent | Out-File $packageJsonPath
	}

	return $version
}

$packageJsonPath = "$PSScriptRoot\package.json"
$bumpPackageVersion = $Publish -and ($GenerateNpmPackage -or $GenerateEverything)

$bumpPatch = (-not $BumpMinor) -and $bumpPackageVersion
$bumpMinor = $BumpMinor -and $bumpPackageVersion

$version = GetAndUpdatePackageVersion $packageJsonPath $bumpPatch $bumpMinor


function Generate-NpmPackage($publishing, $version)
{
	Write-ActionHeading "Generate NPM Package" $publishing $version

	$tempDir = NewTempDir

	# The formmenu.scss and .ts files contain copyright headers with place holders. 
	# Copy them to a temp dir and have those place holders replaced there.
	# Then compile the resulting files.

	Copy-Item "$PSScriptRoot\formmenu\formmenu.scss" "$tempDir\formmenu.scss.template"
	Copy-Item "$PSScriptRoot\formmenu\formmenu.ts" "$tempDir\formmenu.ts.template"
	ProcessTemplates $tempDir $version
	Copy-Item "$PSScriptRoot\formmenu\formmenu.d.ts" "$tempDir\formmenu.d.ts"
	Copy-Item "$PSScriptRoot\formmenu\tsconfig.json" "$tempDir\tsconfig.json"

	RemoveDirectory "$PSScriptRoot\dist"
	EnsureDirectory "$PSScriptRoot\dist"
	InvokeCommand "build formmenu.ts" "tsc --project $tempDir\tsconfig.json --outDir $PSScriptRoot\dist"
	InvokeCommand "compile formmenu.scss" "node-sass $tempDir\formmenu.scss -out-file $PSScriptRoot\dist\formmenu.min.css --source-map $PSScriptRoot\dist\formmenu.css.map --output-style compressed"

	RemoveDirectory $tempDir

	cd "$PSScriptRoot\dist"

	# You can find the google closure compiler at
	# https://github.com/google/closure-compiler
	# documentation at
	# https://developers.google.com/closure/compiler/docs/gettingstarted_app
	InvokeCommand "minimize formmenu.js" "java.exe -jar `"C:\Utils\closure-compiler-v20170423.jar`" --js formmenu.js --js_output_file=formmenu.min.js --create_source_map formmenu.js.map"

	cd "$PSScriptRoot"
	
	if ($publishing) 
	{ 
		InvokeCommand "npm publish" "npm publish"

		$repoUrl = 'git@github.com:mperdeck/formmenu.git'

		InvokeCommand "git add README.md" "git add README.md"
		InvokeCommand "git add LICENSE.md" "git add LICENSE.md"
		InvokeCommand "git add package.json" "git add package.json"
		InvokeCommand "git commit -m `"$version`"" "git commit -m `"$version`""
		InvokeCommand "git push" "git push $repoUrl"

		TagPush "$version" $repoUrl
	}
}

if ($GenerateNpmPackage -or $GenerateEverything -or $UpdateVersions)
{
	ProcessTemplates "." $version
}

if ($GenerateNpmPackage -or $GenerateEverything) 
{
	Generate-NpmPackage $Publish $version
}




