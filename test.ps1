$jobs = @(
    @{ jobName = "bidding-1"; arguments = @("arg1","arg2") },
    @{ jobName = "analytics-1"; arguments = @("arg1","arg2") },
    @{ jobName = "creative-1"; arguments = @("arg1","arg2") },
    @{ jobName = "targeting-1"; arguments = @("arg1","arg2") }
)

foreach ($job in $jobs) {
    Invoke-RestMethod `
        -Uri "http://localhost:3000/jobs" `
        -Method POST `
        -Body ($job | ConvertTo-Json -Depth 3) `
        -ContentType "application/json"
}