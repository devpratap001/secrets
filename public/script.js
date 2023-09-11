function validate(){
    let status= true;
    let pass= document.querySelector(".field")[1];
    let cPass= document.querySelector(".field")[2];
    console.log(pass)
    console.log(cPass)
    if (pass === cPass){
        status= true
        console.log("1")
    } else {
        status= false
        console.log("2")
    }
    return status
}