const MerkleDistributor = artifacts.require("./MerkleDistributor.sol");
const TestERC20 = artifacts.require("./test/TestERC20.sol");
module.exports = function(deployer) {
    deployer.deploy(TestERC20, "TEST", "TST", 999999999999999).then(instance => deployer.deploy(MerkleDistributor, instance.address, "0xef379daf4b14f9e87d10065ce6a30e8905c1af6885586f25243d3afc2f1dd605", 86400));
};