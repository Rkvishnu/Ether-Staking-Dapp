import {useEffect, useState} from 'react';
import { ethers } from 'ethers';
import artifact from './artifacts/contracts/Staking.sol/Staking.json';
import './App.css';
import  NavBar  from './components/NavBar';
import StakeModal from './components/StakeModal';
import ethLogo from './img/eth-logo.png';
import { Bank, PiggyBank, Coin} from 'react-bootstrap-icons';

const CONTRACT_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

function App() {
  //general
  const [provider, setProvider] = useState(undefined);
  const [signer, setSigner] = useState(undefined);
  const [contract, setContract] = useState(undefined);
  const [signerAddress, setSignerAddress] = useState(undefined);

  //assets
  const [assetIds, setAssetIds] = useState(undefined);
  const [assets, setAssets] = useState([]);

  //staking
  const [ showStakeModal, setShowStakeModal] = useState(false);
  const [stakingLength, setStakingLength] = useState('');
  const [stakingPercent, setStakingPercent] = useState('');
  const [amount, setAmount] = useState(0);

  //helper
  const toString = bytes32 => ethers.utils.parseBytes32String(bytes32)
  const toWei = ether => ethers.utils.parseEther(ether)
  const toEther = wei => ethers.utils.formatEther(wei)


  useEffect(() => {
    const onLoad = async () => {
      const provider = await new ethers.providers.Web3Provider(window.ethereum)
      setProvider(provider)

      const contract = await new ethers.Contract(
        CONTRACT_ADDRESS,
        artifact.abi
      )
      setContract(contract)
    }
    onLoad()
  }, [])

  const isConnected = () => signer !== undefined

  const getSigner = async () => {
    provider.send("eth_requestAccounts", [])
    const signer = provider.getSigner()
    return signer
  }

  const getAssetIds = async (address, signer) => {
    const assetIds = await contract.connect(signer).getPositionIdsForAddress(address)
    return assetIds
  }

  const calcDaysRemaining = (unlockDate) => {
    const timeNow = Date.now() / 1000
    const secondsRemaining = unlockDate - timeNow
    return Math.max( (secondsRemaining / 60 / 60 / 24).toFixed(0), 0)
  }

  const getAssets = async (ids, signer) => {
    const queriedAssets = await Promise.all(
      ids.map(id => contract.connect(signer).getPositionById(id))
    )

    queriedAssets.map(async asset => {
      const parsedAsset = {
        positionId: asset.positionId,
        percentInterest: Number(asset.percentInterest) / 100,
        daysRemaining: calcDaysRemaining( Number(asset.unlockDate) ),
        etherInterest: toEther(asset.weiInterest),
        etherStaked: toEther(asset.weiStaked),
        open: asset.open,
      }

      setAssets(prev => [...prev, parsedAsset])
    })
  }

  const connectAndLoad = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send('eth_requestAccounts', []);

    const signer = await getSigner(provider)
    setSigner(signer)

    const signerAddress = await signer.getAddress()
    setSignerAddress(signerAddress)

    const assetIds = await getAssetIds(signerAddress, signer)
    setAssetIds(assetIds)

    getAssets(assetIds, signer)
  }

  const openStakingModal = (stakingLength, stakingPercent) => {
    setShowStakeModal(true)
    setStakingLength(stakingLength)
    setStakingPercent(stakingPercent)
  }

  const stakeEther =  () => {
    const wei = toWei(amount)
    const data = { value: wei }
    contract.connect(signer).stakeEther(stakingLength, data)
  }

  const withdraw = positionId => {
    contract.connect(signer).closePosition(positionId)
  }


  
  return (
    <div className="App">
      <div>
      <NavBar
      isConnected={isConnected}
      connect = {connectAndLoad}
      />
        </div>
        <div className='app-body'>
          <div className= 'market-container'>
            <div className= 'sub-container'>
            <span><img className='eth-logo' src={ethLogo}/></span>
            <span className='market-header'>Ethereum Market</span>
            </div>

          <div className="row">
            <div className='col-md-4'>
              <div onClick={() => openStakingModal(30,'7%')} className='market-option'>
                <div className='glyph-container hover-button'>
                  <span className='glyph'>
                  <Coin />
                  </span>
                </div>
                <div className='option-data'>
                  <span>1 Month</span>
                  <span className='option-percent'>7%</span>
                </div>
              </div>
            </div>

            <div className='col-md-4'>
              <div onClick={() => openStakingModal(90,'10%')} className='market-option'>
                <div className='glyph-container hover-button'>
                  <span className='glyph'>
                  <Coin />
                  </span>
                </div>
                <div className='option-data'>
                  <span>3 Months</span>
                  <span className='option-percent'>10%</span>
                </div>
              </div>
            </div>

            <div className='col-md-4'>
              <div onClick={() => openStakingModal(180,'12%')} className='market-option'>
                <div className='glyph-container hover-button'>
                  <span className='glyph'>
                  <Coin />
                  </span>
                </div>
                <div className='option-data'>
                  <span>6 Months</span>
                  <span className='option-percent'>12%</span>
                </div>
              </div>
            </div>

          </div>

          </div>
       


        <div className='asset-container'>
          <div className='sub-container'>
            <span className='market-header'>Staked Assets</span>
          </div>
          
          <div>
          <div className='row column-headers'>
            <div className='col-md-2'>Assets</div>
            <div className='col-md-2'>Percent Interest</div>
            <div className='col-md-2'>Stake</div>
            <div className='col-md-2'>Interest</div>
            <div className='col-md-2'>Days Remaining</div>
            <div className='col-md-2'></div>
          </div>
          </div>
        <br />

          {assets.length > 0 && assets.map((el, idx) => (
            
            <div className='row'>
           
              <div className='col-md-2'>
              <span>
              <img className='eth-logo2' src={ethLogo} />
              </span>
              </div>

              <div className='col-md-2'>
              {el.percentInterest} %
              </div>

              <div className='col-md-2'>
              {el.etherStaked} 
              </div>

              <div className='col-md-2'>
              {el.etherInterest} 
              </div>

              <div className='col-md-2'>
              {el.daysRemaining} 
              </div>

              <div className='col-md-2'>
              {el.open ? (
                <div onClick={() => withdraw(el.positionId)} className='withdrawal-button'>Withdraw </div>
              ): (
                <span>Closed</span>
              )
              }
              </div>
            </div>
          ))}
        </div>
        </div>

        
         {showStakeModal && (
           <StakeModal
             onClose={() => setShowStakeModal(false)}
             stakingLength={stakingLength}
             stakingPercent={stakingPercent}
             amount={amount}
             setAmount={setAmount}
             stakeEther={stakeEther}
           />
        )}

        </div>

  );
}



export default App;
