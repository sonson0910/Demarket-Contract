import {
    Blockfrost,
    C,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
    Wallet,
} from "https://deno.land/x/lucid@0.8.4/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./beneficiary.seed"));

const Utxos = await lucid.utxosAt(await lucid.wallet.address());

async function payNFTToAddress(): Promise<TxHash> {
    const policyId = "1dc9330346d8cbf35459bd0fe3adf4761f3355b768238785a3c48288";
    const assetName = "000de14041756374696f6e204a75646765";

    const NFT = policyId + assetName;

    console.log(policyId + assetName);

    const tx = await lucid.newTx()
        .payToAddress("addr_test1qpkxr3kpzex93m646qr7w82d56md2kchtsv9jy39dykn4cmcxuuneyeqhdc4wy7de9mk54fndmckahxwqtwy3qg8pums5vlxhz", {
            [NFT]: 1n
        })
        .complete();

    const signedTx = await tx.sign().complete();

    const txHash = await signedTx.submit();
}


console.log(Utxos)
payNFTToAddress();