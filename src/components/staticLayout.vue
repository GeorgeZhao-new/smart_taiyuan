<template>
    <div>
        <img src="/static/top.png">
        <!-- <img src="/static/middle.png" class="left-m">
        <img src="/static/middle.png" class="right-m">
        <img src="/static/bottom.png" class="left-b">
        <img src="/static/bottom.png" class="left-b" style="top: 650px">
        <img src="/static/r-bottom.png" class="right-b"> -->
    </div>
</template>
<script>
export default {
    
}
</script>
<style scoped>
.left-m{
    position:absolute;
    top: 70px;
    left: 10px;
    width: 400px;
}
.right-m{
    position:absolute;
    top: 70px;
    right: 10px;
    width: 400px;
}
.left-b{
    position:absolute;
    top: 400px;
    left: 10px;
    width: 400px;
}

.right-b{
    position:absolute;
    top: 380px;
    right: 10px;
    width: 400px;
}
</style>