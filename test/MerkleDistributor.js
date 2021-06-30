const { assert } = require("chai");

const TestERC20 = artifacts.require("test/TestERC20");
const MerkleDistributor = artifacts.require("MerkleDistributor");


const advanceBlockAtTime = (time) => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_mine",
        params: [time],
        id: new Date().getTime(),
      },
      (err, _) => {
        if (err) {
          return reject(err);
        }
        const newBlockHash = web3.eth.getBlock("latest").hash;
        return resolve(newBlockHash);
      },
    );
  });
};

contract("MerkleDistributor", accounts => {
  it("Should claim shares from merkle root", async function() {
    const token = await TestERC20.deployed(); 
    const merkle = await MerkleDistributor.deployed(); 
    await token.transfer(merkle.address, 99999999999999);

    let shares_result = await merkle.claimShares(28, "0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3", 86400, ["0xc095a4023f83c196a8ccfae501c0e61c3b7ca77f6798432915c56b69a46d0ba1","0x72c08b763fb9a2762b7799dfa2d4bcdd93793811203916e911bf46dbc9cae693","0x6cf0035e4bb72f5f98d966e71e78efa8ca676de1f8bbe2b2e273ce21514a8657","0xc735b663f8ff0299c2ffa4a11cdce0089dd87a7f18385f26bf81c1e5378165ac","0xf90a046f21477fb4091afcbfba006b6d9061540b2de05c8a6fe586814e44d01d","0x8179399e0d53673ae8fb6bd81fc538ebb472c9e683173e26cd489cd6c53cb84c","0xfdc832bf88b1b4d2327f89edcab7968db8804bfd819a40de7d9015178424b0b7"]);
    const userA_locked = await merkle.getInitialLocked("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    assert.equal(await merkle.total_allocated_supply(), userA_locked.toNumber());
  });

  it("Progress time and claim vested shares", async function() {
    const token = await TestERC20.deployed(); 
    const merkle = await MerkleDistributor.deployed();
    
    const latest_block = await web3.eth.getBlock("latest");
    const block_timestamp = latest_block.timestamp;
    const STAKING_PERIOD = await merkle.vestingPeriod();
    const halfway_point = block_timestamp + (STAKING_PERIOD/2);
    const user_locked = await merkle.getInitialLocked("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");

    // Advance forward to claim half of shares.
    await advanceBlockAtTime(halfway_point);

    var vested_after = await merkle.getTotalVestedOf("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    assert.equal(vested_after, user_locked/2, "Vesting schedule incorrect: Shares should be halfway unlocked.")
    
    await merkle.claim("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    
    var user_claimed = await merkle.getTotalClaimed("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    var user_token_bal = await token.balanceOf("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    assert.equal(user_claimed.toNumber(), user_locked/2, "total_claimed[address] mapping is corrupt.");
    assert.equal(user_token_bal.toNumber(), user_locked/2, "Token was not transfered on valid claim.")

    // Advance the rest of the way 
    await advanceBlockAtTime(halfway_point + (STAKING_PERIOD/2));

    vested_after = await merkle.getTotalVestedOf("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    assert.equal(vested_after.toNumber(), user_locked, "Vesting schedule incorrect: Shares should be fully unlocked.")
    
    await merkle.claim("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    
    user_claimed = await merkle.getTotalClaimed("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    user_token_bal = await token.balanceOf("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    assert.equal(user_claimed.toNumber(), user_locked, "total_claimed[address] mapping is corrupt.");
    assert.equal(user_token_bal.toNumber(), user_locked, "Token was not transfered on valid claim.")

    // Advance too far make sure nothing else is unlocked
    await advanceBlockAtTime(halfway_point + (STAKING_PERIOD/2));

    vested_after = await merkle.getTotalVestedOf("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    assert.equal(vested_after.toNumber(), user_locked, "Vesting schedule incorrect: initially locked shares and shares vested mismatch")
    
    await merkle.claim("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    
    user_claimed = await merkle.getTotalClaimed("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    user_token_bal = await token.balanceOf("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    assert.equal(user_claimed.toNumber(), user_locked, "total_claimed[address] mapping is corrupt.");
    assert.equal(user_token_bal.toNumber(), user_locked, "Token was not transfered on valid claim.")
  });

  it("Should test claims for another party", async function() {
    const token = await TestERC20.deployed(); 
    const merkle = await MerkleDistributor.deployed();

    const latest_block = await web3.eth.getBlock("latest");
    const block_timestamp = latest_block.timestamp;
    const STAKING_PERIOD = await merkle.vestingPeriod();
    const halfway_point = block_timestamp + (STAKING_PERIOD/2);

    let shares_result = await merkle.claimShares(62, "0xB96cE59522314ACB1502Dc8d3e192995e36439c1", 98, ["0x7588d361ea0a50e384cd9b16671a46992745711aa9952d3edc7cf32e09dd207a","0xa364f3c88b1127d4ca766ac1d80c6405925b29c44a6d8cdc924454ae8337857f","0xb4d1c4b366e3d81f3ec01130d71d63499b64e8dd568bca33b351b35e0dc7e291","0xd498703e0ed0517a7bedf0f4c2cde77e2ad05fe3ffb70b82f3951add1e4dd668","0xc4b3768cb359f5d1a5f06e193fda2aaf37116cd5b497741fa2117ca1e7cdbe6f","0xc1abbd1f467ace9d50cc7194286ac4a23e357324877091a1c2798a62e72035fe","0xb82d54ac8216d43e27dda2c11b83ba44ee8ab5b30bebd08a6c5a13cde0e70b18"]);
    const userA_locked = await merkle.getInitialLocked("0x5A553d59435Df0688fd5dEa1aa66C7430541ffB3");
    const userB_locked = await merkle.getInitialLocked("0xB96cE59522314ACB1502Dc8d3e192995e36439c1");
    assert.equal(await merkle.total_allocated_supply(), userA_locked.toNumber() + userB_locked.toNumber());

    // Advance forward to claim half of shares.
    await advanceBlockAtTime(halfway_point);

    var vested_after = await merkle.getTotalVestedOf("0xB96cE59522314ACB1502Dc8d3e192995e36439c1");
    assert.equal(vested_after.toNumber(), (userB_locked.toNumber()/2) , "Vesting schedule incorrect: Shares should be halfway unlocked.")
    
    await merkle.claim("0xB96cE59522314ACB1502Dc8d3e192995e36439c1");
    
    var user_claimed = await merkle.getTotalClaimed("0xB96cE59522314ACB1502Dc8d3e192995e36439c1");
    var user_token_bal = await token.balanceOf("0xB96cE59522314ACB1502Dc8d3e192995e36439c1");
    assert.equal(user_claimed.toNumber(), userB_locked.toNumber()/2, "total_claimed[address] mapping is corrupt.");
    assert.equal(user_token_bal.toNumber(), userB_locked.toNumber()/2, "Token was not transfered on valid claim.");

    // Advance the rest of the way 
    await advanceBlockAtTime(halfway_point + (STAKING_PERIOD/2));

    vested_after = await merkle.getTotalVestedOf("0xB96cE59522314ACB1502Dc8d3e192995e36439c1");
    assert.equal(vested_after.toNumber(), userB_locked.toNumber(), "Vesting schedule incorrect: Shares should be fully unlocked.")
    
    await merkle.claim("0xB96cE59522314ACB1502Dc8d3e192995e36439c1");
    
    user_claimed = await merkle.getTotalClaimed("0xB96cE59522314ACB1502Dc8d3e192995e36439c1");
    user_token_bal = await token.balanceOf("0xB96cE59522314ACB1502Dc8d3e192995e36439c1");
    assert.equal(user_claimed.toNumber(), userB_locked.toNumber(), "total_claimed[address] mapping is corrupt.");
    assert.equal(user_token_bal.toNumber(), userB_locked.toNumber(), "Token was not transfered on valid claim.");
  });


});