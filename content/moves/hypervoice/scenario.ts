/**
 * 巨声的可执行设计说明：让会这一招的精灵朝正上方的对手吼一声。
 * 必然事实：声墙是 3D 锥——朝上瞄准时，锥心两侧（x/z 的正负两半）与正上方的高差目标都在范围内；
 *   命中处按实际威力×边缘保留各挨一次伤害，画面用与判定同一个 `data.half`（本次实际整角 arc 的一半）与
 *   `data.reach` 撑起声锥，可见边界就是判定边界。
 * 随机/位置结果（衰减具体值、暴击、水平击退的实际距离、8 目标上限）写进 note 供读轨迹判断。
 * 穿墙与掩体后目标是这招保留的策略（执行不查通视）；共享威胁感知按视线过滤，AI 主动对完全被墙挡住的
 *   对手起唱属人工游玩范围。
 */
Smoke.scenario("hypervoice",function(stage){
    stage.fill([-8,-1,-8],[8,-1,8],"minecraft:stone");
    var caster=stage.pokemon({species:"exploud",level:45,moves:["hypervoice"],at:[0,0,0]});
    var above=stage.mob({type:"minecraft:cow",at:[0,4,0]});
    var negative=stage.mob({type:"minecraft:pig",at:[-.8,4,-.8]});
    var positive=stage.mob({type:"minecraft:sheep",at:[.8,4,.8]});
    [above,negative,positive].forEach(function(body){stage.command("data merge entity "+body.ref.split("/")[0]+" {NoAI:1b,NoGravity:1b}");});
    stage.after(3,function(){stage.provoke(caster,above);});
    stage.until(700,function(){return stage.casts("hypervoice",caster)>0;},function(){
        stage.setPp(caster,"hypervoice",0);
        stage.after(2,function(){
            stage.expect(stage.damageTo(above)>0,"the sound cone was aimed upward at its selected body");
            stage.expect(stage.damageTo(negative)>0,"the upper cone includes the negative horizontal side");
            stage.expect(stage.damageTo(positive)>0,"the upper cone includes the positive horizontal side");
            stage.note("三维声锥的上下两侧命中已核对：锥心按本次实际整角与射程（画面同一 half/reach），击退是沿背离施放者的水平方向（不随瞄准抬升）；衰减具体值、暴击、实际击退距离与 8 目标上限是随机/位置结果；声音保持既有穿掩体策略，AI 不对完全被墙挡住的目标自主索敌。", {
                aboveDamage: Math.round(stage.damageTo(above) * 10) / 10,
                negativeDamage: Math.round(stage.damageTo(negative) * 10) / 10,
                positiveDamage: Math.round(stage.damageTo(positive) * 10) / 10
            });stage.done();
        });
    },"the upward sound cone commits");
});
