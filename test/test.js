const {expect}= require("chai");

describe('Staking', function() {
    beforeEach(async function() {
        [signer1, signer2] = await ethers.getSigners();

        Staking = await ethers.getContractFactory('Staking', signer1);

        staking = await Staking.deploy({
            value: ethers.utils.parseEther('10')
        });
    });

    
    describe('deploy', function() {
        //address should be the owner who deployed the contract
        it('should set owner', async function() {
            expect(await staking.owner()).to.equal(signer1.address)
        })

        it('sets up tiers and lockPeriods', async function() {
            expect(await staking.lockPeriods(0)).to.equal(30)
            expect(await staking.lockPeriods(1)).to.equal(90)
            expect(await staking.lockPeriods(2)).to.equal(180)

            expect(await staking.tiers(30)).to.equal(700)
            expect(await staking.tiers(90)).to.equal(1000)
            expect(await staking.tiers(180)).to.equal(1200)

        })
    })

    describe('stakeEther', function () {
        it('transfers ether', async function() {
            const provider = waffle.provider;
            let contractBalance;
            let signerBalance;
            const transferAmount = ethers.utils.parseEther('2.0')

            contractBalance = await provider.getBalance(staking.address)
            signerBalance = await signer1.getBalance()

            const data = { value: transferAmount }
            //staking ether for 30 days
            const transaction = await staking.connect(signer1).stakeEther(30, data);
            const receipt = await transaction.wait()
            const gasUsed =  receipt.gasUsed.mul(receipt.effectiveGasPrice)

            //test the change in signer 1's ether balance

            expect(
                await signer1.getBalance()
            ).to.equal(
                signerBalance.sub(transferAmount).sub(gasUsed)
            )
            //test the change in contract's ether balance

            expect (
                await provider.getBalance(staking.address)
            ).to.equal(
                contractBalance.add(transferAmount)
            )


        })

        it('adds a position to positions', async function () {
            const provider = waffle.provider;
            let position;
            const transferAmount = ethers.utils.parseEther('1.0')

            position = await staking.positions(0)

            expect(position.positionId).to.equal(0)
            expect(position.walletAddress).to.equal('0x0000000000000000000000000000000000000000')
            expect(position.createdDate).to.equal(0)
            expect(position.unlockDate).to.equal(0)
            expect(position.percentInterest).to.equal(0)
            expect(position.weiStaked).to.equal(0)
            expect(position.weiInterest).to.equal(0)
            expect(position.open).to.equal(false)

            expect(await staking.currentPositionId()).to.equal(0)

            data = {value: transferAmount}
            const transaction = await staking.connect(signer1).stakeEther(90, data);
            const receipt = await transaction.wait()
            //getting the timestamp
            const block = await provider.getBlock(receipt.blockNumber)

            position = await staking.positions(0)

            expect(position.positionId).to.equal(0)
            expect(position.walletAddress).to.equal(signer1.address)
            expect(position.createdDate).to.equal(block.timestamp)
            expect(position.unlockDate).to.equal(block.timestamp + (86400 * 90))
            expect(position.percentInterest).to.equal(1000)
            expect(position.weiStaked).to.equal(transferAmount)
            expect(position.weiInterest).to.equal(ethers.BigNumber.from(transferAmount).mul(1000).div(10000))
            expect(position.open).to.equal(true)

            expect(await staking.currentPositionId()).to.equal(1)
            

        })

        it('adds address and positionId to positionIdsByAddress', async function() {
            const transferAmount = ethers.utils.parseEther('0.5')

            const data = { value: transferAmount}
            await staking.connect(signer1).stakeEther(30, data)
            await staking.connect(signer1).stakeEther(30, data)
            await staking.connect(signer2).stakeEther(90, data)

            expect (await staking.positionIdsByAddress(signer1.address, 0)).to.equal(0)
            expect (await staking.positionIdsByAddress(signer1.address, 1)).to.equal(1)
            expect (await staking.positionIdsByAddress(signer2.address, 0)).to.equal(2)
        })
    })

    describe('modifyLockPeriods', function () {
        describe('owner', function () {
            it('should create a new lock period', async function () {
                await staking.connect(signer1).modifyLockPeriods(100,999);
                expect(await staking.tiers(100)).to.equal(999);
                expect(await staking.lockPeriods(3)).to.equal(100);
            })

            it('should modify an existing lock period', async function () {
                await staking.connect(signer1).modifyLockPeriods(30, 150);
                expect(await staking.tiers(30)).to.equal(150);
                

            })
        })

        describe('non-owner', function () {
            it('reverts', async function() {
                expect(
                    staking.connect(signer2).modifyLockPeriods(100, 999)
                ).to.be.revertedWith(
                    "Only owner may modify staking periods"
                )
            })

        })
    })

    describe('getLockPeriods', function() {
        it('returns all lock periods', async () => {
            const lockPeriods = await staking.getLockPeriods();

            expect(
                lockPeriods.map(v => Number(v._hex))
                //use eql when comparing arrays
            ).to.eql(
                [30,90,180]
            )
        })
    })

    describe('getInterestRate', function() {
        it('returns interest rate for a specific lock', async () => {
            const interestRate = await staking.getInterestRate(30);

            expect(interestRate).to.equal(700)
        })
    })

    describe('getPositionById', function() {
        it('returns data about a specific position, given a positionId', async() => {
            const provider = waffle.provider;

            const transferAmount = ethers.utils.parseEther('3')
            const data = {value: transferAmount}
            const transaction = await staking.connect(signer1).stakeEther(90, data)

            const receipt = transaction.wait()
            const block = await provider.getBlock(receipt.blockNumber)
            
            const position = await staking.connect(signer1.address).getPositionById(0)

            expect(position.positionId).to.equal(0)
            expect(position.walletAddress).to.equal(signer1.address)
            expect(position.createdDate).to.equal(block.timestamp)
            expect(position.unlockDate).to.equal(block.timestamp + (86400 * 90))
            expect(position.percentInterest).to.equal(1000)
            expect(position.weiStaked).to.equal(transferAmount)
            expect(position.weiInterest).to.equal(ethers.BigNumber.from(transferAmount).mul(1000).div(10000))
            expect(position.open).to.equal(true)

        })
    })

    describe('getPositionIdsForAddress', function() {
        it('returns a list of positionIds', async() => {
            let data;
            let transaction;

            data = {value: ethers.utils.parseEther('5')}
            transaction = await staking.connect(signer1).stakeEther(90, data)

            data = {value: ethers.utils.parseEther('10')}
            transaction = await staking.connect(signer1).stakeEther(90, data)

            const positionIds = await staking.getPositionIdsForAddress(signer1.address)

            expect(
                positionIds.map(p => Number(p))
            ).to.eql(
                [0,1]
            )


        })
    })

    describe('changeUnlockDate', function() {
        describe('owner', function() {
            it('changes the unlockDate', async () => {
                const data = {value: ethers.utils.parseEther('8')}
                const transaction = await staking.connect(signer2).stakeEther(90, data)
                const positionOld = await staking.getPositionById(0)

                const newUnlockDate = positionOld.unlockDate - (86400 * 500)
                await staking.connect(signer1).changeUnlockDate(0, newUnlockDate)
                const positionNew = await staking.getPositionById(0)

                expect(
                    positionNew.unlockDate
                ).to.be.equal(
                    positionOld.unlockDate - (86400 * 500)
                )

            })
        })

        describe('non-owner', function() {
            it('reverts', async() => {
                const data = { value: ethers.utils.parseEther('8') }
                const transaction = await staking.connect(signer2).stakeEther(90, data)
                const positionOld = await staking.getPositionById(0)
                const newUnlockDate = positionOld.unlockDate - (86400 * 500)

                expect(
                    staking.connect(signer2).changeUnlockDate(0, newUnlockDate)
                ).to.be.revertedWith(
                    'Only owner may modify staking periods'
                )
            })
        })
    })

    describe('closePosition', function() {
        describe('after unlock date', function(){
            it('transfers principal and interest', async ()=> {
                let transaction;
                let receipt;
                let block;
                const provider = waffle.provider;

                const data = { value: ethers.utils.parseEther('8')}
                transaction = await staking.connect(signer2).stakeEther(90, data)
                receipt = transaction.wait()
                block = await provider.getBlock(receipt.blockNumber)

                const newUnlockDate = block.timestamp - (86400 * 100)
                await staking.connect(signer1).changeUnlockDate(0, newUnlockDate)

                const position = await staking.getPositionById(0)

                const signerBalanceBefore = await signer2.getBalance()
                transaction = await staking.connect(signer2).closePosition(0)
                receipt = await transaction.wait()

                const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)
                const signerBalanceAfter = await signer2.getBalance()

                expect(
                    signerBalanceAfter
                ).to.equal(
                    signerBalanceBefore
                    .sub(gasUsed)
                    .add(position.weiInterest)
                    .add(position.weiStaked)
                )

            })

        })
        
        describe('before unlock date', function () {
            it('transfers only principal', async () => {
                let transaction;
                let receipt;
                let block;
                const provider = waffle.provider;

                const data = { value: ethers.utils.parseEther('5')}
                transaction = await staking.connect(signer2).stakeEther(90, data)
                receipt = transaction.wait()
                block = await provider.getBlock(receipt.blockNumber)


                const position = await staking.getPositionById(0)

                const signerBalanceBefore = await signer2.getBalance()
                transaction = await staking.connect(signer2).closePosition(0)
                receipt = await transaction.wait()

                const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)
                const signerBalanceAfter = await signer2.getBalance()

                expect(
                    signerBalanceAfter
                ).to.equal(
                    signerBalanceBefore
                    .sub(gasUsed)
                    .add(position.weiStaked)
                )
            })
        })


})

})