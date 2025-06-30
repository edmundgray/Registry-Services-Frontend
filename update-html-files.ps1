# Update HTML Files Script
# This script will update all HTML files to use the new dynamic sidebar system

$htmlFiles = @(
    "c:\Users\edmun\source\repos\RegistryServices-Frontend\RegistryServices\HTML\additionalRequirements.html",
    "c:\Users\edmun\source\repos\RegistryServices-Frontend\RegistryServices\HTML\coreInvoiceModel.html",
    "c:\Users\edmun\source\repos\RegistryServices-Frontend\RegistryServices\HTML\coreInvoiceModelRead.html",
    "c:\Users\edmun\source\repos\RegistryServices-Frontend\RegistryServices\HTML\ExtensionComponentDataModel.html",
    "c:\Users\edmun\source\repos\RegistryServices-Frontend\RegistryServices\HTML\ExtensionComponentDataModelRead.html",
    "c:\Users\edmun\source\repos\RegistryServices-Frontend\RegistryServices\HTML\governingEntityList.html",
    "c:\Users\edmun\source\repos\RegistryServices-Frontend\RegistryServices\HTML\governingEntityView.html",
    "c:\Users\edmun\source\repos\RegistryServices-Frontend\RegistryServices\HTML\IdentifyingInformation.html",
    "c:\Users\edmun\source\repos\RegistryServices-Frontend\RegistryServices\HTML\specificationPreview.html",
    "c:\Users\edmun\source\repos\RegistryServices-Frontend\RegistryServices\HTML\viewSpecification.html"
)

Write-Host "HTML files to update:" -ForegroundColor Green
$htmlFiles | ForEach-Object { Write-Host "  - $_" }
Write-Host ""
Write-Host "Total files: $($htmlFiles.Count)" -ForegroundColor Yellow
