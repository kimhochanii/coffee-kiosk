// Shared order store backed by Firebase Realtime Database.
// Both iPads (customer kiosk + kitchen) connect to the same cloud DB,
// so orders sync in real time across separate devices over the internet.
//
// Requires the Firebase compat SDK to be loaded BEFORE this file:
//   <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-database-compat.js"></script>

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBVi0HnqoJLMi5lLEt9S3zJ5C8r4VC_u6E",
    authDomain: "coffee-test-671f0.firebaseapp.com",
    databaseURL: "https://coffee-test-671f0-default-rtdb.firebaseio.com",
    projectId: "coffee-test-671f0",
    storageBucket: "coffee-test-671f0.firebasestorage.app",
    messagingSenderId: "128237813549",
    appId: "1:128237813549:web:d58e191c0b6d561264dda4"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  const ordersRef = db.ref("orders");

  const subscribers = [];
  let cache = []; // array of order objects, each with a hidden _key

  ordersRef.on("value", (snap) => {
    const val = snap.val() || {};
    cache = Object.entries(val).map(([k, v]) => ({ _key: k, ...v }));
    subscribers.forEach((cb) => { try { cb(); } catch (e) {} });
  });

  // Notify a callback whenever orders change (locally or from the other iPad).
  function subscribe(cb) { subscribers.push(cb); }

  // Current snapshot of orders (kept live by the listener above).
  function loadOrders() { return cache; }

  // Customer side: assign a GLOBAL order number via a Firebase transaction
  // (so two order kiosks never produce duplicate numbers), then push the
  // order. Returns a Promise that resolves to the assigned number.
  function addOrder(order) {
    const counterRef = db.ref("counter");
    return counterRef.transaction((cur) => {
      let n = (cur || 0) + 1;
      if (n > 999) n = 1; // wrap around
      return n;
    }).then((res) => {
      const num = res.snapshot.val();
      order.number = num;
      ordersRef.push(order);
      return num;
    });
  }

  // Kitchen side: update the items of an order (e.g. mark one done).
  function setItems(key, items) { db.ref("orders/" + key + "/items").set(items); }

  // Remove a finished order (or used by "clear all").
  function removeOrder(key) { db.ref("orders/" + key).remove(); }
  function clearAll() { ordersRef.remove(); }

  window.KioskStore = {
    loadOrders, addOrder, subscribe,
    setItems, removeOrder, clearAll
  };
})();
