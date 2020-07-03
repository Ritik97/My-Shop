const deleteProduct = (btn) => {
    //Getting the values present in the form
    const prodId = (btn.parentNode.querySelector('[name=productId]').value);
    const csrfToken = (btn.parentNode.querySelector('[name=_csrf]').value);
    const userId = (btn.parentNode.querySelector('[name=userid]').value);

    const productElement = btn.closest('article');

    /**fetch()  method  is supported by the browser, both for sending requests and getting response from the server 
     * We still need to attach our csrf token. The delete request doesn't have a body, but we can attach it to the headers as 
     * our csrf package also check headers and query parameters for the token
    */

    fetch('/admin/product/' + prodId, {
        method: 'DELETE',
        headers: {
            "csrf-token": csrfToken
        }
    })
        .then(result => {
            console.log(result);
            productElement.parentNode.removeChild(productElement);
        }).catch(err => {
            console.log(err);
        });
};