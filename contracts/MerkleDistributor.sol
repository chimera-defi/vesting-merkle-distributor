// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.6.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IMerkleDistributor.sol";

contract MerkleDistributor is IMerkleDistributor {
    using SafeMath for uint256;

    address public immutable override token;
    bytes32 public immutable override merkleRoot;
    uint256 public immutable vestingPeriod;

    uint256 public total_allocated_supply;

    mapping(address => uint256) initial_locked;
    mapping(address => uint256) total_claimed;
    mapping(address => uint256) start_time;
    mapping(address => uint256) end_time;

    // This is a packed array of booleans.
    mapping(uint256 => uint256) private claimedBitMap;


    constructor(address token_, bytes32 merkleRoot_, uint256 vestingPeriod_) public {
        token = token_;
        merkleRoot = merkleRoot_;
        vestingPeriod = vestingPeriod_;
        total_allocated_supply = 0;
    }

    function isClaimed(uint256 index) public view override returns (bool) {
        uint256 claimedWordIndex = index.div(256);
        uint256 claimedBitIndex = index.mod(256);
        uint256 claimedWord = claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index.div(256);
        uint256 claimedBitIndex = index.mod(256);
        claimedBitMap[claimedWordIndex] = claimedBitMap[claimedWordIndex] | (1 << claimedBitIndex);
    }

    function _allocateShares(address account, uint256 amount) private {
        require((IERC20(token).balanceOf(address(this)) - (total_allocated_supply + amount)) > 0, 'MerkleDistributor: Inadequate contract balance');
        initial_locked[account] = amount;
        total_claimed[account] = 0;
        start_time[account] = block.timestamp;
        end_time[account] = vestingPeriod.add(block.timestamp);
        total_allocated_supply = total_allocated_supply.add(amount);
    }

    function claimShares(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external override {
        require(!isClaimed(index), 'MerkleDistributor: Drop already claimed.');

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        require(MerkleProof.verify(merkleProof, merkleRoot, node), 'MerkleDistributor: Invalid proof.');

        // Mark it claimed and begin vesting account.
        _setClaimed(index);
        _allocateShares(account, amount);

        emit ClaimedShares(index, account, amount);
    }

    function total_vested_of(address account) public view returns (uint) {
        uint256 start = start_time[account];
        uint256 locked = initial_locked[account];
        uint256 t = block.timestamp;
        if(t < start){
            return 0;
        }
        uint256 result =  locked.mul(t.sub(start)).div(vestingPeriod);
        if(result < locked) {
            return result;
        } else {
            return locked;
        }
    }

    function getStartTime(address account) public view returns (uint256) {
        return start_time[account];
    }

    function getEndTime(address account) public view returns (uint256) {
        return end_time[account];
    }

    function getTotalClaimed(address account) public view returns (uint256) {
        return total_claimed[account];
    }

    function getInitialLocked(address account) public view returns (uint256) {
        return initial_locked[account];
    }

    function claim(address account) external override {
        uint256 claimable = total_vested_of(account).sub(total_claimed[account]);
        total_claimed[account] = total_claimed[account].add(claimable);
        require(IERC20(token).transfer(account, claimable), 'MerkleDistributor: Transfer failed.');

        emit claimed(account, claimable);
    }
}
