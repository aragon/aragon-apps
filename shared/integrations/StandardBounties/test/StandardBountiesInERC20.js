const StandardBounties = artifacts.require("../contracts/StandardBounties");
const HumanStandardToken = artifacts.require("../contracts/inherited/HumanStandardToken");

const utils = require('./helpers/Utils');

const BN = require('bignumber.js');

contract('StandardBounties', function(accounts) {


  it("[ERC20] Verifies that the StandardBounties registry works", async () => {

    let registry = await StandardBounties.new();

  });

  it("[ERC20] Verifies that I can issue a bounty paying in ERC20 tokens without locking up funds", async () => {

    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    let total = await registry.numBounties();

    assert(parseInt(total, 10) == 1, parseInt(total, 10));

  });

  it("[ERC20] Verifies that I can issue a bounty paying in ERC20 tokens while locking up funds", async () => {

    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 1);

    let total = await registry.numBounties();

    assert(parseInt(total, 10) == 1, parseInt(total, 10));

    let bounty = await registry.bounties(0);

    assert(parseInt(bounty.balance, 10) == 1);

  });

  it("[ERC20] Verifies that I can't issue a bounty in tokens contributing both tokens and ETH", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    try {
      await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 1, {value: 1});

    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");

  });

  it("[ERC20] Verifies that I can't issue a bounty contributing less than the deposit amount", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1, {from: accounts[0]});

    try {
      await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can contribute to a bounty in ERC20 tokens", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 1);

    await registry.contribute(accounts[0], 0, 1);

    let bounty = await registry.bounties(0);

    assert(parseInt(bounty.balance, 10) == 2);

  });

  it("[ERC20] Verifies that I can't contribute to a bounty which is out of bounds", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    try {
      await registry.contribute(accounts[0], 1, 1);

    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't contribute to a bounty and send less than the deposit amount", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1, {from: accounts[0]});

    try {
      await registry.contribute(accounts[0], 0, 10);

    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't contribute to a bounty and send both tokens and ETH", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1, {from: accounts[0]});

    try {
      await registry.contribute(accounts[0], 0, 1, {value: 1});

    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });
  it("[ERC20] Verifies that contributing emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1).then((status) => {
      assert.strictEqual('ContributionAdded', status.logs[0].event, 'did not emit the ContributionAdded event');
    });

  });

  it("[ERC20] Verifies that I can refund a contribution in ERC20 tokens", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);

    let bounty = await registry.bounties(0);

    assert(parseInt(bounty.balance, 10) == 1);

    var block = await web3.eth.getBlock('latest');

    await registry.changeDeadline(accounts[0], 0, 0, parseInt(block.timestamp, 10) - 10);


    await registry.refundContribution(accounts[0], 0,0);

    bounty = await registry.bounties(0);

    assert(parseInt(bounty.balance, 10) == 0);
  });

  it("[ERC20] Verifies that I can't refund a contribution to a bounty which is out of bounds", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);

    var block = await web3.eth.getBlock('latest');

    await registry.changeDeadline(accounts[0], 0, 0, parseInt(block.timestamp, 10) - 10);

    try {
      await registry.refundContribution(accounts[0], 1, 0);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");

  });

  it("[ERC20] Verifies that I can't refund a contribution which is out of bounds", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);

    var block = await web3.eth.getBlock('latest');

    await registry.changeDeadline(accounts[0], 0, 0, parseInt(block.timestamp, 10) - 10);


    try {
      await registry.refundContribution(accounts[0], 0, 1);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't refund a contribution which isn't mine", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});
    await bountyToken.transfer(accounts[1], 1000, {from: accounts[0]});
    await bountyToken.approve(registry.address, 1000, {from: accounts[1]});

    await registry.contribute(accounts[0], 0, 1, {from: accounts[0]});
    await registry.contribute(accounts[1], 0, 1, {from: accounts[1]});

    var block = await web3.eth.getBlock('latest');

    await registry.changeDeadline(accounts[0], 0, 0, parseInt(block.timestamp, 10) - 10);

    try {
      await registry.refundContribution(accounts[1], 0,0, {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't refund a contribution which has already been refunded", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);


    var block = await web3.eth.getBlock('latest');

    await registry.changeDeadline(accounts[0], 0, 0, parseInt(block.timestamp, 10) - 10);

    await registry.refundContribution(accounts[0], 0, 0);

    try {
      await registry.refundContribution(accounts[0], 0, 0);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't refund a contribution before the deadline has elapsed", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);


    try {
      await registry.refundContribution(accounts[0], 0, 0);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that refunding a contribution emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);


    let bounty = await registry.bounties(0);

    assert(parseInt(bounty.balance, 10) == 1);

    var block = await web3.eth.getBlock('latest');

    await registry.changeDeadline(accounts[0], 0, 0, parseInt(block.timestamp, 10) - 10);

    await registry.refundContribution(accounts[0], 0, 0).then((status) => {
      assert.strictEqual('ContributionRefunded', status.logs[0].event, 'did not emit the ContributionRefunded event');
    });
  });

  it("[ERC20] Verifies that I can refund all of my contributions", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);


    var block = await web3.eth.getBlock('latest');

    await registry.changeDeadline(accounts[0], 0, 0, parseInt(block.timestamp, 10) - 10);

    await registry.refundMyContributions(accounts[0], 0, [0, 1, 2]);
    let bounty = await registry.bounties(0);

    assert(parseInt(bounty.balance, 10) == 0);
  });

  it("[ERC20] Verifies that I can't refund contributions if one of them isn't mine", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});
    await bountyToken.transfer(accounts[1], 100);
    await bountyToken.approve(registry.address, 100, {from: accounts[1]});


    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[1], 0, 1, {from: accounts[1]});

    var block = await web3.eth.getBlock('latest');

    await registry.changeDeadline(accounts[0], 0, 0, parseInt(block.timestamp, 10) - 10);

    try {
      await registry.refundMyContributions(accounts[0], 0, [0, 1, 2]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can refund a set of contributions as an issuer", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);

    await registry.refundContributions(accounts[0], 0, 0, [0, 1, 2]);
    let bounty = await registry.bounties(0);

    assert(parseInt(bounty.balance, 10) == 0);
  });

  it("[ERC20] Verifies that I can't refund contributions if I'm not an issuer", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[2]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);

    try {
      await registry.refundContributions(accounts[0], 0, 0, [0, 1, 2]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't refund contributions for an invalid bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);

    try {
      await registry.refundContributions(accounts[0], 1, 0, [0, 1, 2]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't refund contributions with an out of bounds contribution ID", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);

    try {
      await registry.refundContributions(accounts[0], 0, 0, [0, 1, 4]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't refund contributions when one of them has been refunded already", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);

    var block = await web3.eth.getBlock('latest');

    await registry.changeDeadline(accounts[0], 0, 0, parseInt(block.timestamp, 10) - 10);

    await registry.refundContribution(accounts[0], 0, 0);

    try {
      await registry.refundContributions(accounts[0], 0, 0, [0, 1, 2]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that refunding several contributions emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);

    await registry.refundContributions(accounts[0], 0, 0, [0, 1, 2]).then((status) => {
      assert.strictEqual('ContributionsRefunded', status.logs[0].event, 'did not emit the ContributionsRefunded event');
    });

  });

  it("[ERC20] Verifies that I can drain my bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[3]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);

    let bounty = await registry.bounties(0);

    assert(parseInt(bounty.balance, 10) == 1);

    await registry.drainBounty(accounts[3], 0, 0, [1], {from: accounts[3]});

    let newBounty = await registry.bounties(0);

    assert(parseInt(newBounty.balance, 10) == 0);
  });

  it("[ERC20] Verifies that I can drain a bounty as a 2nd issuer", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[3], accounts[1]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);

    let bounty = await registry.bounties(0);

    assert(parseInt(bounty.balance, 10) == 1);

    await registry.drainBounty(accounts[1], 0, 1, [1], {from: accounts[1]});

    let newBounty = await registry.bounties(0);

    assert(parseInt(newBounty.balance, 10) == 0);
  });

  it("[ERC20] Verifies that I can't drain someone else's bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[3]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);

    try {
      await registry.drainBounty(accounts[1], 0, 0, [1], {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't drain a bounty without passing in an array of correct length", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[3]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);

    try {
      await registry.drainBounty(accounts[3], 0, 0, [1, 1], {from: accounts[3]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't drain a bounty of more funds than its balance", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[3]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);

    try {
      await registry.drainBounty(accounts[3], 0, 0, [2], {from: accounts[3]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that draining a bounty emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[3]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.contribute(accounts[0], 0, 1);

    await registry.drainBounty(accounts[3], 0, 0, [1], {from: accounts[3]}).then((status) => {
      assert.strictEqual('BountyDrained', status.logs[0].event, 'did not emit the BountyDrained event');
    });

  });

  it("[ERC20] Verifies that I can perform an action for a bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await registry.performAction(accounts[0], 0, "actionData");

  });

  it("[ERC20] Verifies that I can't perform an action for an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    try {
      await registry.performAction(accounts[0], 1, "actionData");
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that performing an action emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await registry.performAction(accounts[0], 0, "actionData").then((status) => {
      assert.strictEqual('ActionPerformed', status.logs[0].event, 'did not emit the ActionPerformed event');
    });
  });

  it("[ERC20] Verifies that I can fulfill a bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    let bounty = await registry.getBounty(0);
    assert(bounty.fulfillments.length == 1);
    assert(bounty.fulfillments[0].fulfillers[0] == accounts[1]);
    assert(bounty.fulfillments[0].fulfillers[1] == accounts[2]);
    assert(bounty.fulfillments[0].submitter == accounts[0]);

  });

  it("[ERC20] Verifies that I can't fulfill an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);



    try {
      await registry.fulfillBounty(accounts[0], 1, [accounts[1], accounts[2]], "data");
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");

  });

  it("[ERC20] Verifies that I can't fulfill a bounty after the deadline has elapsed", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 1, bountyToken.address, 20, 1);

    try {
      await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't fulfill a bounty with 0 fulfillers", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    try {
      await registry.fulfillBounty(accounts[0], 0, [], "data");
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that fulfilling a bounty emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data").then((status) => {
      assert.strictEqual('BountyFulfilled', status.logs[0].event, 'did not emit the BountyFulfilled event');
    });

  });

  it("[ERC20] Verifies that I can update a fulfillment", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    await registry.updateFulfillment(accounts[0], 0, 0, [accounts[3], accounts[4]], "data2");

    let bounty = await registry.getBounty(0);

    assert(bounty.fulfillments.length == 1);
    assert(bounty.fulfillments[0].fulfillers[0] == accounts[3]);
    assert(bounty.fulfillments[0].fulfillers[1] == accounts[4]);
    assert(bounty.fulfillments[0].submitter == accounts[0]);


  });

  it("[ERC20] Verifies that I can't update a fulfillment for an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);



    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    try {
      await registry.updateFulfillment(accounts[0], 1, 0, [accounts[3], accounts[4]], "data2");
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't update an out of bounds fulfillment", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);



    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    try {
      await registry.updateFulfillment(accounts[0], 0, 1, [accounts[3], accounts[4]], "data2");
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't update a fulfillment which was submitted by someone else", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);



    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    try {
      await registry.updateFulfillment(accounts[0], 0, 0, [accounts[3], accounts[4]], "data2", {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that updating a fulfillment emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);



    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    await registry.updateFulfillment(accounts[0], 0, 0, [accounts[3], accounts[4]], "data2").then((status) => {
      assert.strictEqual('FulfillmentUpdated', status.logs[0].event, 'did not emit the FulfillmentUpdated event');
    });

  });

  it("[ERC20] Verifies that I can accept a fulfillment as an issuer", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    await registry.acceptFulfillment(accounts[0], 0, 0, 0,[5,5])

  });

  it("[ERC20] Verifies that I can accept a fulfillment paying different amounts to different fulfillers", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    await registry.acceptFulfillment(accounts[0], 0, 0, 0,[2,8]);
  });

  it("[ERC20] Verifies that I can accept a fulfillment as an approver", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.fulfillBounty(accounts[0], 0, [accounts[5], accounts[6]], "data");

    await registry.acceptFulfillment(accounts[1], 0, 0, 1,[5,5], {from: accounts[1]})

  });

  it("[ERC20] Verifies that I can't accept a fulfillment on an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    try {
      await registry.acceptFulfillment(accounts[0], 1,0,0,[2,8], {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't accept a fulfillment which is out of bounds", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    try {
      await registry.acceptFulfillment(accounts[1], 0,1,0,[2,8], {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't accept a fulfillment if I'm not an approver", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    try {
      await registry.acceptFulfillment(accounts[3], 0,0,0,[2,8], {from: accounts[3]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't accept a fulfillment by passing in the wrong number of token amounts corresponding to the number of fulfillers", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    try {
      await registry.acceptFulfillment(accounts[0], 0,0,0,[2], {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't accept a fulfillment paying out more than the balance of my bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    try {
      await registry.acceptFulfillment(accounts[1], 0,0,0,[2,18], {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that accepting a fulfillment emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    await registry.acceptFulfillment(accounts[1], 0,0,0,[2,8], {from: accounts[1]}).then((status) => {
      assert.strictEqual('FulfillmentAccepted', status.logs[0].event, 'did not emit the FulfillmentAccepted event');
    });
  });

  it("[ERC20] Verifies that I can fulfill and accept a bounty simultaneously", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.fulfillAndAccept(accounts[0], 0, [accounts[1], accounts[2]], "data", 0, [2, 8]);
  });

  it("[ERC20] Verifies that I can change all of a bounty's info", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.changeBounty(accounts[0], 0, 0, [accounts[5]], [accounts[6], accounts[7]], "data2", 2528821200);

    var bounty = await registry.getBounty(0);

    assert(bounty.issuers[0] === accounts[5]);
    assert(bounty.approvers[0] === accounts[6]);
    assert(bounty.approvers[1] === accounts[7]);
    assert(bounty.deadline == 2528821200);

  });

  it("[ERC20] Verifies that I can't change an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    try {
      await registry.changeBounty(accounts[0], 1, 0, [accounts[5]], [accounts[6], accounts[7]], "data2", 2528821200);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");

  });

  it("[ERC20] Verifies that I can't change a bounty if I'm not an issuer'", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    try {
      await registry.changeBounty(accounts[1], 0, 0, [accounts[5]], [accounts[6], accounts[7]], "data2", 2528821200, {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can change the issuer of my bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.changeIssuer(accounts[0], 0, 0, 0, accounts[1]);

    var bounty = await registry.getBounty(0);

    assert(bounty.issuers[0] === accounts[1]);

  });

  it("[ERC20] Verifies that I can't change the issuer of an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeIssuer(accounts[0], 1, 0, 0, accounts[1]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't change the issuer of a bounty if I didn't issue it", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeIssuer(accounts[1], 0, 0, 0, accounts[1], {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't the issuer with an out of bounds issuer ID", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeIssuer(accounts[0], 0, 1, 0, accounts[1], {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't the issuer changing an out of bounds issuer ID", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeIssuer(accounts[0], 0, 0, 1, accounts[1], {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that changing a bounty's issuer emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.changeIssuer(accounts[0], 0, 0, 0, accounts[1]).then((status) => {
      assert.strictEqual('BountyIssuersUpdated', status.logs[0].event, 'did not emit the BountyIssuersUpdated event');
    });
  });

  it("[ERC20] Verifies that I can change the approver of my bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.changeApprover(accounts[0], 0, 0, 0, accounts[5]);

    var bounty = await registry.getBounty(0);

    assert(bounty.approvers[0] === accounts[5]);

  });

  it("[ERC20] Verifies that I can't change the approver of an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeApprover(accounts[0], 1, 0, 0, accounts[5]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't change the approver of a bounty if I didn't issue it", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeApprover(accounts[1], 0, 0, 0, accounts[5], {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't the issuer with an out of bounds issuer ID", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeApprover(accounts[0], 0, 1, 0, accounts[5], {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't the issuer changing an out of bounds approver ID", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeApprover(accounts[0], 0, 0, 2, accounts[5], {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that changing a bounty's approver emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.changeApprover(accounts[0], 0, 0, 0, accounts[5]).then((status) => {
      assert.strictEqual('BountyApproversUpdated', status.logs[0].event, 'did not emit the BountyApproversUpdated event');
    });
  });


  it("[ERC20] Verifies that I can change the data of my bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.changeData(accounts[0], 0, 0, "data2").then((status) => {
      assert.strictEqual('data2',  status.logs[0].args[2]);
    });

  });

  it("[ERC20] Verifies that I can't change the data of an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeData(accounts[0], 1, 0, "data2");
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't change the data of a bounty if I didn't issue it", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeData(accounts[1], 0, 0, "data2", {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't change the data with an out of bounds issuer ID", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeData(accounts[0], 0, 1, "data2", {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that changing a bounty's data emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.changeData(accounts[0], 0, 0, "data2").then((status) => {
      assert.strictEqual('BountyDataChanged', status.logs[0].event, 'did not emit the BountyDataChanged event');
    });
  });

  it("[ERC20] Verifies that I can change the deadline of my bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.changeDeadline(accounts[0], 0, 0, 2628821098);

    var bounty = await registry.getBounty(0);

    assert(bounty.deadline == 2628821098);

  });

  it("[ERC20] Verifies that I can't change the deadline of an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeDeadline(accounts[0], 1, 0, 2628821098);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't change the deadline of a bounty if I didn't issue it", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeDeadline(accounts[1], 0, 0, 2628821098, {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't change the deadline with an out of bounds issuer ID", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.changeDeadline(accounts[0], 0, 1, 2628821098, {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that changing a bounty's deadline emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.changeDeadline(accounts[0], 0, 0, 2628821098).then((status) => {
      assert.strictEqual('BountyDeadlineChanged', status.logs[0].event, 'did not emit the BountyDeadlineChanged event');
    });
  });

  it("[ERC20] Verifies that I can add issuers to my bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.addIssuers(accounts[0], 0, 0, [accounts[5], accounts[6]]);

    var bounty = await registry.getBounty(0);

    assert(bounty.issuers[1] == accounts[5]);
    assert(bounty.issuers[2] == accounts[6]);


  });

  it("[ERC20] Verifies that I can't add issuers to an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.addIssuers(accounts[0], 1, 0, [accounts[5], accounts[6]]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't add issuers to a bounty if I didn't issue it", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.addIssuers(accounts[1], 0, 0, [accounts[5], accounts[6]], {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't add issuers with an out of bounds issuer ID", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.addIssuers(accounts[0], 0, 1, [accounts[5], accounts[6]], {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that adding issuers to a bounty emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.addIssuers(accounts[0], 0, 0, [accounts[5], accounts[6]]).then((status) => {
      assert.strictEqual('BountyIssuersUpdated', status.logs[0].event, 'did not emit the BountyIssuersUpdated event');
    });
  });

  it("[ERC20] Verifies that I can replace the issuers of my bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.replaceIssuers(accounts[0], 0, 0, [accounts[5], accounts[6]]);

    var bounty = await registry.getBounty(0);

    assert(bounty.issuers[0] == accounts[5]);
    assert(bounty.issuers[1] == accounts[6]);


  });

  it("[ERC20] Verifies that I can't replace issuers for an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.replaceIssuers(accounts[0], 1, 0, [accounts[5], accounts[6]]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't replace issuers for a bounty if I didn't issue it", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.replaceIssuers(accounts[1], 0, 0, [accounts[5], accounts[6]], {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't replace issuers with an out of bounds issuer ID", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.replaceIssuers(accounts[0], 0, 1, [accounts[5], accounts[6]], {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that replacing issuers of a bounty emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.replaceIssuers(accounts[0], 0, 0, [accounts[5], accounts[6]]).then((status) => {
      assert.strictEqual('BountyIssuersUpdated', status.logs[0].event, 'did not emit the BountyIssuersUpdated event');
    });
  });


  it("[ERC20] Verifies that I can add approvers to my bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.addApprovers(accounts[0], 0, 0, [accounts[5], accounts[6]]);

    var bounty = await registry.getBounty(0);

    assert(bounty.approvers[2] == accounts[5]);
    assert(bounty.approvers[3] == accounts[6]);

  });

  it("[ERC20] Verifies that I can't add approvers to an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.addApprovers(accounts[0], 1, 0, [accounts[5], accounts[6]]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't add approvers to a bounty if I didn't issue it", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.addApprovers(accounts[1], 0, 0, [accounts[5], accounts[6]], {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't add approvers with an out of bounds issuer ID", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.addApprovers(accounts[0], 0, 1, [accounts[5], accounts[6]], {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that adding approvers to a bounty emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.addApprovers(accounts[0], 0, 0, [accounts[5], accounts[6]]).then((status) => {
      assert.strictEqual('BountyApproversUpdated', status.logs[0].event, 'did not emit the BountyApproversUpdated event');
    });
  });

  it("[ERC20] Verifies that I can replace the approvers of my bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);


    await registry.replaceApprovers(accounts[0], 0, 0, [accounts[5], accounts[6]]);

    var bounty = await registry.getBounty(0);

    assert(bounty.approvers[0] == accounts[5]);
    assert(bounty.approvers[1] == accounts[6]);


  });

  it("[ERC20] Verifies that I can't replace approvers for an out of bounds bounty", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.replaceApprovers(accounts[0], 1, 0, [accounts[5], accounts[6]]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't replace approvers for a bounty if I didn't issue it", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.replaceApprovers(accounts[1], 0, 0, [accounts[5], accounts[6]], {from: accounts[1]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that I can't replace approvers with an out of bounds issuer ID", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    try {
      await registry.replaceApprovers(accounts[0], 0, 1, [accounts[5], accounts[6]], {from: accounts[0]});
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });

  it("[ERC20] Verifies that replacing approvers of a bounty emits an event", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");


    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

await registry.issueAndContribute(accounts[0], [accounts[0]], [accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20, 10);

    await registry.replaceApprovers(accounts[0], 0, 0, [accounts[5], accounts[6]]).then((status) => {
      assert.strictEqual('BountyApproversUpdated', status.logs[0].event, 'did not emit the BountyApproversUpdated event');
    });
  });
  it("[ERC20] Verifies that I can't accept a fulfillment, and still try to refund everyone's contributions", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);

    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    await registry.acceptFulfillment(accounts[0], 0, 0, 0, [1,1]);

    try {
      await registry.refundContributions(accounts[0], 0, 0, [0, 1, 2]);
    } catch (error){
      return utils.ensureException(error);
    }
    assert(false, "Should have thrown an error");
  });
  it("[ERC20] Verifies that I can accept a fulfillment, and still try to refund some contributions", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);


    await registry.fulfillBounty(accounts[0], 0, [accounts[1], accounts[2]], "data");

    await registry.acceptFulfillment(accounts[0], 0, 0, 0,[1,1]);

    await registry.refundContributions(accounts[0], 0, 0, [0, 1, 2]);
  });

  it("[ERC20] Verifies that I can refund a contribution, and still drain the remaining funds", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);

    var block = await web3.eth.getBlock('latest');

    await registry.changeDeadline(accounts[0], 0, 0, parseInt(block.timestamp, 10) - 10);

    await registry.refundContribution(accounts[0], 0,0);

    await registry.drainBounty(accounts[0], 0, 0, [4]);
  });

  it("[ERC20] Verifies that I can't refund a contribution, and still drain all of the funds", async () => {
    let registry = await StandardBounties.new();
    let bountyToken = await HumanStandardToken.new(1000000000, "Bounty Token", 18, "BOUNT");

    await bountyToken.approve(registry.address, 1000, {from: accounts[0]});

    await registry.issueBounty(accounts[0], [accounts[0]], [accounts[0], accounts[1], accounts[2]], "data", 2528821098, bountyToken.address, 20);

    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);
    await registry.contribute(accounts[0], 0, 1);

    var block = await web3.eth.getBlock('latest');

    await registry.changeDeadline(accounts[0], 0, 0, parseInt(block.timestamp, 10) - 10);

    await registry.refundContribution(accounts[0], 0,0);

    try {
      await registry.drainBounty(accounts[0], 0, 0, [5]);
    } catch (error){
      return utils.ensureException(error);
    }
  });
});
