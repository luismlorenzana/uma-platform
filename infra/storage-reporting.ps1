param([switch]$Apply)
$ErrorActionPreference = 'Stop'

# Provision only the daily metadata collector. Existing app and game accounts are unchanged.
$reportProject = 'uma-rpg'
$reportAccount = 'platform-storage-report@uma-rpg.iam.gserviceaccount.com'
$reportRole = 'platformStorageMetadataReader'
$reportRoot = Split-Path -Parent $PSScriptRoot

function Read-CloudJson([string]$Project, [string[]]$Arguments) {
    $result = & gcloud --configuration=default --project=$Project --quiet @Arguments --format=json 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return ($result -join "`n" | ConvertFrom-Json)
}
function Write-Cloud([string]$Project, [string[]]$Arguments) {
    if (-not $Apply) { Write-Host ('PLAN gcloud --configuration=default --project=' + $Project + ' ' + ($Arguments -join ' ')); return }
    & gcloud --configuration=default --project=$Project --quiet @Arguments --format=none
    if ($LASTEXITCODE -ne 0) { throw 'Storage reporting provisioning failed.' }
}

$projectInfo = Read-CloudJson $reportProject @('projects', 'describe', $reportProject)
if (-not $projectInfo.projectNumber) { throw 'Could not verify the reporting project.' }
$account = Read-CloudJson $reportProject @('iam', 'service-accounts', 'describe', $reportAccount)
if (-not $account) {
    Write-Cloud $reportProject @('iam', 'service-accounts', 'create', 'platform-storage-report', '--display-name=Uma storage metadata collector')
}

$buckets = @{
    'uma-rpg' = @('uma-platform-content', 'uma-farm-content', 'uma-quest-content', 'uma-rpg-content')
    'uma-platform-lm' = @('uma-platform-authoring', 'uma-platform-master-data')
}
foreach ($project in $buckets.Keys) {
    $role = Read-CloudJson $project @('iam', 'roles', 'describe', $reportRole)
    if ($role) {
        $actual = @($role.includedPermissions | Sort-Object)
        if (($actual -join ',') -ne 'storage.buckets.get,storage.objects.list') { throw 'Existing metadata role has unexpected permissions.' }
    } else {
        Write-Cloud $project @('iam', 'roles', 'create', $reportRole, '--title=Uma storage metadata reader', '--description=Bucket metadata and object listings without source object reads', '--permissions=storage.buckets.get,storage.objects.list', '--stage=GA')
    }
    foreach ($bucket in $buckets[$project]) {
        Write-Cloud $project @('storage', 'buckets', 'add-iam-policy-binding', "gs://$bucket", "--member=serviceAccount:$reportAccount", "--role=projects/$project/roles/$reportRole", '--condition=None')
    }
}

$reportConditionFile = Join-Path $reportRoot '.cache/storage-report-condition.json'
New-Item -ItemType Directory -Path (Split-Path -Parent $reportConditionFile) -Force | Out-Null
@{ expression = 'resource.name.startsWith("projects/_/buckets/uma-platform-content/objects/reports/storage/snapshots/")'; title = 'storage-report-snapshots' } |
    ConvertTo-Json | Set-Content -LiteralPath $reportConditionFile -Encoding utf8
foreach ($roleName in @('roles/storage.objectCreator', 'roles/storage.objectViewer')) {
    Write-Cloud $reportProject @('storage', 'buckets', 'add-iam-policy-binding', 'gs://uma-platform-content', "--member=serviceAccount:$reportAccount", "--role=$roleName", "--condition-from-file=$reportConditionFile")
}
$principal = 'principalSet://iam.googleapis.com/projects/' + $projectInfo.projectNumber + '/locations/global/workloadIdentityPools/github-actions/attribute.repository/luismlorenzana/uma-platform'
Write-Cloud $reportProject @('iam', 'service-accounts', 'add-iam-policy-binding', $reportAccount, "--member=$principal", '--role=roles/iam.workloadIdentityUser')
Write-Host $(if ($Apply) { 'Metadata-only reporting identity provisioned.' } else { 'Plan only. Use -Apply after reviewing the plan.' })
