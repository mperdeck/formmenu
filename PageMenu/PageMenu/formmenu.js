// "DOMContentLoaded" fires when the html has loaded, even if the stylesheets, javascript, etc are still being loaded.
// "load" fires when the entire page has loaded, including stylesheets, etc.
document.addEventListener("DOMContentLoaded", function () {
    console.log('page has loaded');
    var list = document.querySelector('#list');
    var fruits = ['Apple', 'Orange', 'Banana', 'Melon'];
    var fragment = new DocumentFragment();
    fruits.forEach(function (fruit) {
        var li = document.createElement('li');
        li.innerHTML = fruit;
        fragment.appendChild(li);
    });
    list.appendChild(fragment);
});
//# sourceMappingURL=formmenu.js.map