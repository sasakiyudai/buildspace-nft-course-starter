import "./styles/App.css";
import toast, { Toaster } from "react-hot-toast";
import twitterLogo from "./assets/twitter-logo.svg";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import myEpicNft from "./utils/MyEpicNFT.json";

// Constants
const TWITTER_HANDLE = "__syudai__";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
// eslint-disable-next-line
const OPENSEA_LINK = "https://testnets.opensea.io/0xaae9a5e003d9a679078e97daf382a173f8e6c31b";
// eslint-disable-next-line
const TOTAL_MINT_COUNT = 50;

const CONTRACT_ADDRESS = "0x6C77fb08E3A5fd4a374E30fD8B02F3F6d270f65f";

const { ethereum } = window;

const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [minted, setMinted] = useState(0);

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

  const updateMintedSoFar = async () => {
    const nftContract = await connectToContract();
    const mintedSoFar = await nftContract.mintedSoFar();

    setMinted(mintedSoFar.toNumber());
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
        updateMintedSoFar();
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
      updateMintedSoFar();
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

        connectedContract.on("NewEpicNFTMinted", (from, tokenId) => {
          console.log(from, tokenId.toNumber());
          alert(
            `Hey there! We've minted your NFT and sent it to your wallet. It may be blank right now. It can take a max of 10 min to show up on OpenSea. Here's the link: https://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${tokenId.toNumber()}`
          );
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
    try {
      if (ethereum) {
        const res = await checkAndSwitchChain();

        if (res === "failed") {
          return;
        }

        const toastId = toast.loading("材料を集めています..", {
          duration: 2000,
        });

        setTimeout(
          () =>
            toast.loading("材料をいい感じに切ったり焼いたりしてます...", {
              id: toastId,
              duration: 3000,
            }),
          1000
        );

        setTimeout(
          () =>
            toast.loading("Minting it as NFT...", {
              id: toastId,
              duration: Infinity,
            }),
          3000
        );

        const connectedContract = await connectToContract();

        console.log("Going to pop wallet now to pay gas...");
        let nftTxn = await connectedContract.makeAnEpicNFT();

        toast.loading("Transaction is being mined...", {
          id: toastId,
          duration: Infinity,
        });
        await nftTxn.wait();

        toast.success(
          `Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`,
          {
            id: toastId,
            duration: 3000,
          }
        );

        setupEventListener();
        updateMintedSoFar();
      } else {
        toast.error("Please install Metamask");
        return;
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Error occured, check console");

      console.log(err);
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
            position="bottom-center"
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
            {minted}/{TOTAL_MINT_COUNT}
          </p>
          {currentAccount === ""
            ? renderNotConnectedContainer()
            : renderMintUI()}
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
