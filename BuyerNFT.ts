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

// Chon vi nguoi mua
const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./beneficiary.seed"));


// Ham doc validator tu file plutus.json
async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

// Public key nguoi mua
const beneficiaryPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

// Doc validator va gan vao mot bien
const validator = await readValidator();

// ---------------------------------------------------

// Doc dia chi hop dong tu bien validator
const scriptAddress = lucid.utils.validatorToAddress(validator);


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

// Du lieu cua NFT de loc ra UTxO chua NFT do
const policyId = "aaabb0206b0be1f1fd0ee2066bcad049b059d301d6df96b6ec1894dd";
const assetName = "4e46542044454d4f";



// Lay ra datum cua UTxO chua NFT can mua
let UTOut;

// Lay ra toan bo UTxO co tren dia chi hop dong
const scriptUtxos = await lucid.utxosAt(scriptAddress);

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

const exchange_fee = BigInt(parseInt(UTOut.price) * 1 / 100);

// Hop dong khong dung redeemer nhung cai nay bat buoc phai co nen khoi tao rong
const redeemer = Data.empty();

// Ham mo khoa tai san len hop dong
async function unlock(utxos, UTOut, exchange_fee, { from, using }): Promise<TxHash> {
    console.log(BigInt(UTOut.price));
    // Khoi tao giao dich
    const tx = await lucid
        .newTx()
        .payToAddress("addr_test1qpkxr3kpzex93m646qr7w82d56md2kchtsv9jy39dykn4cmcxuuneyeqhdc4wy7de9mk54fndmckahxwqtwy3qg8pums5vlxhz", { lovelace: UTOut.price }) // Gui tien cho nguoi ban
        .payToAddress("addr_test1qqayue6h7fxemhdktj9w7cxsnxv40vm9q3f7temjr7606s3j0xykpud5ms6may9d6rf34mgwxqv75rj89zpfdftn0esq3pcfjg", { lovelace: exchange_fee }) // Phi san
        .payToAddress("addr_test1vqhs6zag6mfkr8qj8l59sh5mfx7g0ay6hc8qfza6y8mzp9c3henpx", { lovelace: UTOut.royalties }) // Gui tien cho nguoi mua
        .collectFrom(utxos, using) // Tieu thu UTxO (Lay NFT co tren hop dong ve vi)
        .attachSpendingValidator(from) // Tham chieu den hop dong, neu duoc xac nhan, moi dau ra se duoc thuc thi
        .complete();

    console.log(1)

    // Ki giao dich
    const signedTx = await tx
        .sign()
        .complete();

    // Gui giao dich len onchain
    return signedTx.submit();
}

// Thuc thi giao dich mua tai san co tren hop dong
const txUnlock = await unlock(utxos, UTOut, exchange_fee, { from: validator, using: redeemer });
console.log(1);

// Thoi gian cho den khi giao dich duoc xac nhan tren Blockchain
await lucid.awaitTx(txUnlock);

console.log(`NFT recovered from the contract
    Tx ID: ${txUnlock}
    Redeemer: ${redeemer}
`);

