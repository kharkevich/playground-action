const core = require('@actions/core');
const github = require('@actions/github');



// function to get issue comments
async function getIssueComments(octokit, owner, repo, issue_number) {
    response = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments{?since,per_page,page}', {
        owner: owner,
        repo: repo,
        issue_number: issue_number
    });
    // const response = await octokit.issues.listComments({
    //     owner,
    //     repo,
    //     issue_number
    // });
    return response.data;
}

async function main() {
    try {
        // `who-to-greet` input defined in action metadata file
        const nameToGreet = core.getInput('who-to-greet');
        console.log(`Hello ${nameToGreet}!`);
        const time = (new Date()).toTimeString();
        core.setOutput("time", time);
        // Get the JSON webhook payload for the event that triggered the workflow
        const payload = JSON.stringify(github.context.payload, undefined, 2)
        console.log(`The event payload: ${payload}`);
        const issue_number = github.context.payload.issue.number;
        console.log(`The issue number is: ${issue_number}`);
        console.log(`The repo is: ${github.context.repo.repo}`);
        console.log(`The owner is: ${github.context.repo.owner}`);
        const octokit = new github.getOctokit(core.getInput('repo-token'));
        const comments = await getIssueComments(octokit, github.context.repo.owner, github.context.repo.repo, issue_number);
        console.log(`The comments are: ${JSON.stringify(comments)}`);
    } catch (error) {
        core.setFailed(error.message);
    }
}

main();