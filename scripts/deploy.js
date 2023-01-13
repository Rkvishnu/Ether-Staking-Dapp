

async function main () {
    [signer1, signer2] = await ethers.getSigners();
    
    const Staking = await ethers.getContractFactory('Staking', signer1);
    
    staking = await Staking.deploy({
        value: ethers.utils.parseEther('10')
    });
    
    console.log("Staking contract deployed to:", staking.address, "by", signer1.address)
    
    const provider = waffle.provider;
    let data;
    let transaction;
    let receipt;
    let block;
    let newUnlockDate;
    
    data={value: ethers.utils.parseEther('0.5')}
    transaction = await staking.connect(signer2).stakeEther(30, data)
    
    data={value: ethers.utils.parseEther('1.0')}
    transaction = await staking.connect(signer2).stakeEther(180, data)
    
    data={value: ethers.utils.parseEther('1.75')}
    transaction = await staking.connect(signer2).stakeEther(180, data)
    
    data={value: ethers.utils.parseEther('5')}
    transaction = await staking.connect(signer2).stakeEther(90, data)
    receipt = await transaction.wait()
    block = await provider.getBlock(receipt.blockNumber)
    newUnlockDate = block.timestamp - (60 * 60 * 24 * 100)
    await staking.connect(signer1).changeUnlockDate(3, newUnlockDate)
    
    data={value: ethers.utils.parseEther('1.75')}
    transaction = await staking.connect(signer2).stakeEther(180, data)
    receipt = await transaction.wait()
    block = await provider.getBlock(receipt.blockNumber)
    newUnlockDate = block.timestamp - (60 * 60 * 24 * 100)
    await staking.connect(signer1).changeUnlockDate(4, newUnlockDate)
    
    
    
    }
    
    main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
    
    