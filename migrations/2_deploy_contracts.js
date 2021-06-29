var MerkleDistributor = artifacts.require("./MerkleDistributor.sol");
var TestERC20 = artifacts.require("./test/TestERC20.sol");
//var TestERC20 = artifacts.require("../contracts/test/TestERC20.sol”);
module.exports = function(deployer) {
    deployer.deploy(TestERC20, "TEST", "TST", 99999999999999).then(instance => deployer.deploy(MerkleDistributor, instance.address, "0x65b315f4565a40f738cbaaef7dbab4ddefa14620407507d0f2d5cdbd1d8063f6", 86400));
    // Additional contracts can be deployed here
};