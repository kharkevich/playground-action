const core = require('@actions/core');
const github = require('@actions/github');


// function to get issue comments
async function getIssueComments(octokit, owner, repo, issue_number) {
    response = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments{?since,per_page,page}', {
        owner: owner,
        repo: repo,
        issue_number: issue_number
    });
    return response.data;
}

// function to get team members
async function getTeamMembers(octokit, org, team_slug) {
    response = await octokit.request('GET /orgs/{org}/teams/{team_slug}/members', {
        org: org,
        team_slug: team_slug
    });
    return response.data;
}


async function main() {
    try {
        // const time = (new Date()).toTimeString();
        // core.setOutput("time", time);
        // Get the JSON webhook payload for the event that triggered the workflow
        const octokit = new github.getOctokit(core.getInput('repo-token'));
        const mode = core.getInput('mode');
        let team_members;
        if (mode === 'team') {
            team_members = await getTeamMembers(octokit, github.context.repo.owner, core.getInput('approvers'));
            console.log(JSON.stringify(team_members, undefined, 2));
            // core.setOutput("team_members", team_members);
        } else {
            team_members = core.getInput('approvers').split(',').map((x) => x.trim());
        }
        const payload = JSON.stringify(github.context.payload, undefined, 2)
        // console.log(`The event payload: ${payload}`);
        const issue_number = github.context.payload.issue.number;
        console.log(`The issue number is: ${issue_number}`);
        console.log(`The repo is: ${github.context.repo.repo}`);
        console.log(`The owner is: ${github.context.repo.owner}`);

        const comments = await getIssueComments(octokit, github.context.repo.owner, github.context.repo.repo, issue_number);
        console.log(Array.isArray(comments));
        comments.sort((a, b) => b.id - a.id);
        // console.log(`The comments are: ${JSON.stringify(comments, undefined, 2)}`);
        const decline_words = core.getInput('decline-words').split(',').map(word => word.trim());
        const approve_words = core.getInput('approve-words').split(',').map(word => word.trim());
        core.info(`Decline words: ${decline_words}`);
        console.log(decline_words);
        console.log(Array.isArray(decline_words));
        core.info(`Approve words: ${approve_words}`);
        console.log(Array.isArray(approve_words));
        let approvals = [];
        for (let comment of comments) {
            if (decline_words.some(word => comment.body.includes(word))) {
                core.info("Issue was declined");
                if (core.getBooleanInput('fail-on-decline')) {
                    core.setFailed('The action has been declined');
                }
                core.setOutput('approved', false);
                return;
            }
            if (approve_words.some(word => comment.body.includes(word))) {
                team_members.forEach(member => {
                    if (comment.user.login === member && !approvals.includes(member)) {
                        approvals.push(member);
                        console.log(`The approvals are: ${approvals}`);
                    }
                });
            }
            if (approvals.length >= core.getInput('minimum-approvals')) {
                core.setOutput("approved", true);
                core.info("Issue was approved");
                return;
            }
        }
        if (approvals.length < core.getInput('minimum-approvals')) {
            core.setOutput("approved", "undefined");
            core.info("Count of approvals is less than minimum approvals");
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

main();