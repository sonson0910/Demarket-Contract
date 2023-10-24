// import module tu cac thu vien
import {
    Blockfrost,
    C,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
} from "https://deno.land/x/lucid@0.8.3/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

// Khoi tao api lucid
const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

// Chon vi nguoi ban NFT
const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./owner.seed"));

// Public key nguoi ban
const beneficiaryPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

// Ham doc validator tu file plutus.json
async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

// Doc validator va gan vao mot bien
const validator = await readValidator();

// ---------------------------------------------------
// Doc dia chi hop dong tu bien validator
const scriptAddress = lucid.utils.validatorToAddress(validator);

// we get all the UTXOs sitting at the script address
const scriptUtxos = await lucid.utxosAt(scriptAddress);

// Khoi tao doi tuong cua Datum
const Datum = Data.Object({
    policyId: Data.String,
    assetName: Data.String,
    seller: Data.String,
    author: Data.String,
    price: Data.BigInt,
    royalties: Data.BigInt,
});

type Datum = Data.Static<typeof Datum>;

// Du lieu cua NFT de loc ra UTxO chua NFT can lay ve
const policyId = "e96b0d9a84fd55c57d734d3eff7afea31a71835bfe0f841d1f1ba470";
const assetName = "44656d61726b6574";

// Lay ra datum cua UTxO chua NFT can mua
let UTOut;

// Loc ra UTxO chua NFT can mua 
const utxos = scriptUtxos.filter((utxo) => {
    try {
        // Do du lieu datum ra bien temp cua UTxO hien tai
        const temp = Data.from<Datum>(utxo.datum, Datum);

        // Kiem tra xem UTxO do co that su dang chua NFT dang can mua khong?
        if (temp.policyId === policyId && temp.assetName === assetName) {
            UTOut = Data.from<Datum>(utxo.datum, Datum); // Lay datum cua UTxO do ra mot bien
            return true; // UTxO do da duoc lay
        }

        return false; // UTxO do khong duoc chon 
    } catch (e) {
        return false; // UTxO do khong duoc chon 
    }
});

console.log(UTOut)

// Neu khong co UTxO nao duoc chon thi se dung chuong trinh
if (utxos.length === 0) {
    console.log("No redeemable utxo found. You need to wait a little longer...");
    Deno.exit(1);
}


// Hop dong khong dung redeemer nhung cai nay bat buoc phai co nen khoi tao rong
const redeemer = Data.empty();

// Ham mo khoa tai san len hop dong
async function unlock(utxos, { from, using }): Promise<TxHash> {
    const tx = await lucid // Khoi tao giao dich
        .newTx()
        .collectFrom(utxos, using) // Tieu thu UTxO (Lay NFT co tren hop dong ve vi)
        .addSigner(await lucid.wallet.address()) // Them chu ki tu nguoi ban
        .attachSpendingValidator(from) // Tham chieu den hop dong, neu duoc xac nhan, moi dau ra se duoc thuc thi
        .complete();

    // Ki giao dich
    const signedTx = await tx
        .sign()
        .complete();
    // Gui giao dich len onchain
    return signedTx.submit();
}

// Thuc thi lay lai tai san da ban co tren hop dong
const txUnlock = await unlock(utxos, { from: validator, using: redeemer });

// Thoi gian cho den khi giao dich duoc xac nhan tren Blockchain
await lucid.awaitTx(txUnlock);

console.log(`NFT recovered from the contract
    Tx ID: ${txUnlock}
    Redeemer: ${redeemer}
`);

