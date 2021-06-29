const MerkleDistributor = artifacts.require("MerkleDistributor");

contract("MerkleDistributor", accounts => {
  it("Should return the new greeting once it's changed", async function() {
    const greeter = await Greeter.new("Hello, world!");
    assert.equal(await greeter.greet(), "Hello, world!");

    await greeter.setGreeting("Hola, mundo!");

    assert.equal(await greeter.greet(), "Hola, mundo!");
  });
});