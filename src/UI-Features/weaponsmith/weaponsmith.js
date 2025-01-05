import * as WP from "./weapons.js";
import * as UTILS from "/src/utils.js";
import "./style.css";

const testWeapon = new WP.Weapon(
  "Steel Pistol",
  12,
  2.2,
  300,
  "Pistol",
  200,
  "images/steel_pistol.png",
  "A pistol forged from steel. Slightly more powerful and faster than the starter Iron Pistol.",
  "red",
);

let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

testWeapon.assignCanvas(canvas);

animate();
function animate() {
  testWeapon.updateProjectiles();
  requestAnimationFrame(animate);
}
addEventListener("mousedown", (e) => {
  const origin = new UTILS.Vec2(window.innerWidth / 2, window.innerHeight / 2);
  const target = new UTILS.Vec2(e.clientX, e.clientY);
  testWeapon.shoot(origin, target);
});

addEventListener("keydown", (e) => {
  if (e.key === " ") {
    testWeapon.reload();
  }
});

// DOM Manipulation
let mainShopContainer = document.getElementById("mainShopContainer");
let shopHeader = document.getElementById("headerContainer");
let scrollItemsContainer = document.getElementById("scrollItemsContainer");
let currentItemName = document.getElementById("name");
let currentItemPrice = document.getElementById("price");
let currentItemImg = document.getElementById("gunPreviewImg");
let currentItemDesc = document.getElementById("itemDesc");
let currentItemDmg = document.getElementById("dmg");
let currentItemRng = document.getElementById("rng");
let currentItemSpd = document.getElementById("spd");
let currentItemMagSize = document.getElementById("magSize");
let currentItemReloadTime = document.getElementById("reloadTime");
let priceButton = document.getElementById("priceBtn");
let buyButton = document.getElementById("buyBtn");
let moneyContainer = document.getElementById("moneyIndContainer");
buyButton.addEventListener("click", () => {
  let currentSelectedItem = document.getElementById("name").innerHTML;
  buyItem(currentSelectedItem);
});
const starterItems = WP.starterWeapons;
fillShop(starterItems);
function buyItem(item) {
  console.log("Bought: ", item);
}
function fillShop(weapons) {
  // prefill with first item
  currentItemName.innerHTML = weapons[0].name;
  currentItemPrice.innerHTML = weapons[0].cost;
  currentItemImg.src = weapons[0].img;
  currentItemDesc.innerHTML = weapons[0].desc;
  currentItemDmg.innerHTML = weapons[0].damage;
  currentItemRng.innerHTML = weapons[0].range;
  currentItemSpd.innerHTML = weapons[0].speed;
  currentItemMagSize.innerHTML = weapons[0].magSize;
  currentItemReloadTime.innerHTML = weapons[0].reloadTime;
  priceButton.innerHTML = "Buy - " + weapons[0].cost;

  // fill the shop with items

  for (let i of weapons) {
    let item = document.createElement("div");
    item.classList.add("itemContainer");
    item.innerHTML = i.name;
    item.addEventListener("click", () => {
      currentItemName.innerHTML = i.name;
      currentItemPrice.innerHTML = i.cost;
      currentItemImg.src = i.img;
      currentItemDesc.innerHTML = i.desc;
      currentItemDmg.innerHTML = i.damage;
      currentItemRng.innerHTML = i.range;
      currentItemSpd.innerHTML = i.speed;
      currentItemMagSize.innerHTML = i.magSize;
      currentItemReloadTime.innerHTML = i.reloadTime;
      priceButton.innerHTML = "Buy - " + i.cost;
    });
    scrollItemsContainer.appendChild(item);
  }
}

function moveUIUp() {
  mainShopContainer.classList.add("up");
  mainShopContainer.classList.remove("down");
}

// Function to move the UI down
function moveUIDown() {
  mainShopContainer.classList.add("down");
  mainShopContainer.classList.remove("up");
}

function moveMoneyUp() {
  moneyContainer.classList.add("up");
  moneyContainer.classList.remove("down");
}

function moveMoneyDown() {
  moneyContainer.classList.add("down");
  moneyContainer.classList.remove("up");
}

// setTimeout(() => {
//   moveUIDown();
//   moveMoneyDown();
// }, 1000);
