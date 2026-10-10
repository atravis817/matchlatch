import {readFileSync} from 'node:fs';
import {POLICY,policyHash} from '../lib/commerce-policy.mjs';
const approved=readFileSync(new URL('../policies/commerce-policy.sha256',import.meta.url),'utf8').trim();
if(policyHash!==approved)throw Error('Commerce policy changed without updating the reviewed manifest. Explicit owner review is required.');
if(POLICY.monthlyBudgetUsd!==5||POLICY.alertUsd!==3||POLICY.webSearchLiveFetch!==false||POLICY.productionEnabled!==false||POLICY.approvedRetailerAdapters.length)throw Error('Reviewed development permission/budget scope changed; obtain explicit owner review and update executable expectations.');
console.log('PASS reviewed commerce policy '+POLICY.version+' '+policyHash);
