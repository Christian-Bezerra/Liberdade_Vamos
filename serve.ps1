$env:APPDATA = $PSScriptRoot
$env:NUGET_PACKAGES = Join-Path $PSScriptRoot '.nuget'
& dotnet run --configfile (Join-Path $PSScriptRoot 'NuGet.Config') --project (Join-Path $PSScriptRoot 'server\Liberdade.Server.csproj')
