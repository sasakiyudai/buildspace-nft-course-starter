import "./styles/App.css";
import toast, { Toaster } from "react-hot-toast";
import twitterLogo from "./assets/twitter-logo.svg";
import React, { useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import myEpicNft from "./utils/MyEpicNFT.json";
import TextField from "@mui/material/TextField";

// Constants
const TWITTER_HANDLE = "__syudai__";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const OPENSEA_LINK =
  "https://testnets.opensea.io/0xaae9a5e003d9a679078e97daf382a173f8e6c31b";
const TOTAL_MINT_COUNT = 10000;
const USER_MAX_NFT_COUNT = 3;

const CONTRACT_ADDRESS = "0x0e3D219Caf29779aD05e4416b2A2Cda0f00716aB";

const IPFS_PREFIX_URL = "https://ipfs.io/ipfs/QmZ7idFYQMPwZcwvcii2YKUxV9xTze3gsuM58Kp6Sc9up8/"
const IPFS_SUFFIX_URL = ".png";

const { ethereum } = window;

const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [totalSupply, setTotalSupply] = useState(0);
  const [youMinted, setYouMinted] = useState(0);
  const [msgValue, setMsgValue] = useState("");
  const inputRef = useRef(null);
  const [inputError, setInputError] = useState(false);

  const connectToContract = async () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const connectedContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      myEpicNft.abi,
      signer
    );

    return connectedContract;
  };

  const updateTotalSupply = async () => {
    const connectedContract = await connectToContract();
    const mintedSoFar = await connectedContract.totalSupply();

    setTotalSupply(mintedSoFar.toNumber());
  };

  const updateYouMinted = async () => {
    let account = "";
    if (currentAccount === "") {
      if (ethereum) {
        const accounts = await ethereum.request({ method: "eth_accounts" });
        account = accounts[0];
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } else {
      account = currentAccount;
    }

    const connectedContract = await connectToContract();
    const mintedSoFar = await connectedContract.balanceOf(account);

    setYouMinted(mintedSoFar.toNumber());
  };

  const checkIfWalletIsConnected = async () => {
    const toastId = toast.loading("Checking for connected wallet...");

    if (!ethereum) {
      toast.error("Make sure you have metamask!", { id: toastId });
      return;
    } else {
      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length === 0) {
        toast.error("No account connected", { id: toastId });
      } else {
        const account = accounts[0];
        setCurrentAccount(account);

        toast.success("Connected with " + account, { id: toastId });

        setupEventListener();
        updateTotalSupply();
        updateYouMinted();
      }
    }
  };

  const connectWallet = async () => {
    const toastId = toast.loading("Connecting to wallet..");

    try {
      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      toast.success("Successfully connected!", { id: toastId });
      setCurrentAccount(accounts[0]);

      setupEventListener();
      updateTotalSupply();
      updateYouMinted();
    } catch (err) {
      if (err.code === 4001) {
        toast.error("User rejected the connection!", { id: toastId });
        return;
      } else {
        console.log("An error occured -", err);
        toast.error("An error occured while connecting!", { id: toastId });
        return;
      }
    }
  };

  const checkAndSwitchChain = async () => {
    const chainId = await ethereum.request({ method: "eth_chainId" });

    if (chainId !== "0x4") {
      const chainToast = toast.loading("Please connect to rinkeby...");

      await ethereum
        .request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x4" }],
        })
        .then(() => {
          toast.success("Successfully connected to rinkeby!", {
            id: chainToast,
          });
          return "success";
        })
        .catch((err) => {
          toast.error("Failed to connect to rinkeby!", { id: chainToast });
          console.error(err);

          return "failed";
        });
    }

    return "already connected";
  };

  const setupEventListener = async () => {
    try {
      const res = checkAndSwitchChain();
      if (res === "failed") {
        console.log("error happend");
        return;
      }

      if (ethereum) {
        const connectedContract = await connectToContract();

        connectedContract.on("NewNFTMinted", (from, tokenId) => {
          console.log(from, tokenId.toNumber());
          updateTotalSupply();
          updateYouMinted();
        });

        console.log("Setup event listener!");
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const askContractToMintNft = async () => {
    if (msgValue === "" || inputError === true) {
      toast.dismiss();
      toast.error("Please Enter Number, in support >= 0");
      return;
    }

    if (youMinted === USER_MAX_NFT_COUNT) {
      toast.dismiss();
      toast.error("The maximum number of NFTs you can get is 3.");
      return;
    }

    try {
      if (ethereum) {
        const res = await checkAndSwitchChain();

        if (res === "failed") {
          return;
        }

        const toastId = toast.loading("setting up..", {
          duration: 2000,
        });

        toast.loading("Minting your NFT...", {
          id: toastId,
          duration: Infinity,
        });

        const connectedContract = await connectToContract();

        console.log("Going to pop wallet now to pay gas...");
        let nftTxn = await connectedContract.mint(1, {
          value: ethers.utils.parseEther(msgValue),
        });

        toast.loading("Transaction is being mined...", {
          id: toastId,
          duration: Infinity,
        });
        await nftTxn.wait();

        toast.success(
          `Mined successfully! : https://rinkeby.etherscan.io/tx/${nftTxn.hash}`,
          { id: toastId }
        );

        setupEventListener();
        updateTotalSupply();
        updateYouMinted();
      } else {
        toast.error("Please install Metamask");
        return;
      }
    } catch (err) {
      toast.dismiss();

      toast.error("Error occured, check console");
      // console.log(err);
    }
  };

  const handleInputChange = (e) => {
    setMsgValue(e.target.value);

    if (inputRef.current) {
      const ref = inputRef.current;
      if (!ref.validity.valid) {
        setInputError(true);
      } else {
        setInputError(false);
      }
    }
  };

  // Render Methods
  const renderNotConnectedContainer = () => (
    <button
      onClick={connectWallet}
      className="cta-button connect-wallet-button"
    >
      Connect to Wallet
    </button>
  );

  const renderMintUI = () => (
    <button
      onClick={askContractToMintNft}
      className="cta-button connect-wallet-button"
    >
      Mint NFT
    </button>
  );

  useEffect(() => {
    checkIfWalletIsConnected();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "black",
                color: "#fff",
                maxWidth: "800px",
                textAlign: "left",
              },
            }}
          />
          <p className="header gradient-text">My NFT Collection</p>
          <p className="sub-text">
            Each unique. Each beautiful. Discover your NFT today.
          </p>
          <p className="sub-text">
            {totalSupply}/{TOTAL_MINT_COUNT}
          </p>
          <img src={`${IPFS_PREFIX_URL}${totalSupply+1}${IPFS_SUFFIX_URL}`}  alt="NFT" className="photo" />
          
          <div></div>

          <TextField
            error={inputError}
            value={msgValue}
            onChange={handleInputChange}
            color="success"
            label="support >= 0 (ETH)"
            variant="standard"
            inputRef={inputRef}
            helperText={
              inputRef?.current?.validationMessage
                ? "数値を入力してください"
                : ""
            }
            inputProps={{ inputMode: "numeric", pattern: "\\d+(?:\\.\\d+)?" }}
          />
          {currentAccount === ""
            ? renderNotConnectedContainer()
            : renderMintUI()}
          
          <p className="sub-text">
            You've minted {youMinted} NFT{youMinted > 1 ? "s" : ""}.
          </p>
          <p className="sub-text">
            You can mint up to {USER_MAX_NFT_COUNT} NFTs.
          </p>
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
          <hr></hr>
          <a
            className="footer-text"
            href={OPENSEA_LINK}
            target="_blank"
            rel="noreferrer"
          >{`🌊 View Collection on OpenSea`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
