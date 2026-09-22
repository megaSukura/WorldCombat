/**
 * 回收利用的可执行设计说明：一只携带树果的宝可梦，在战斗中失去这件持有物之后把它回收。
 *
 * 场面：施法者带着一颗树果站在场上，与一只近处目标开战；本单元的规则在它绑定时就记下这件持有物。
 * 随后由脚本把这件持有物从手里拿走（测试夹具直接调用原生 removeHeldItem，代替「被消耗」的那一步——
 * 本单元自己的装配里没有会消耗持有物的招式，真实对局由投掷、啄食、打落等其它单元或原生树果消耗完成，
 * 它们同样会触发本单元监听的持有物变化）。
 *
 * 必然事实：本招被提交过；提交后那件持有物确实回到了手里（测试夹具读原生持有物来核对，是确定结果）。
 */
Smoke.scenario("recycle", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Aipom", level: 30, moves: ["recycle"], item: "cobblemon:oran_berry", at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Geodude", level: 30, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);

    /** 测试夹具：读施法者当前的持有物（`<数量> <id>` 或空）。 */
    function heldNow(): string {
        try {
            var server = Java.loadClass("net.neoforged.neoforge.server.ServerLifecycleHooks").getCurrentServer();
            if (server === null) return "";
            var id = String(caster.ref).split("/")[0], iter = server.overworld().getAllEntities().iterator();
            while (iter.hasNext()) {
                var entity = iter.next();
                if (String(entity.uuid) === id && typeof entity.getPokemon === "function") return String(entity.getPokemon().heldItem());
            }
        } catch (error) { }
        return "";
    }

    // 测试夹具：把施法者手里的持有物拿走，制造「已经消耗掉」的状态。
    stage.after(40, function () {
        try {
            var server = Java.loadClass("net.neoforged.neoforge.server.ServerLifecycleHooks").getCurrentServer();
            if (server === null) return;
            var id = String(caster.ref).split("/")[0], iter = server.overworld().getAllEntities().iterator();
            while (iter.hasNext()) {
                var entity = iter.next();
                if (String(entity.uuid) === id && typeof entity.getPokemon === "function") entity.getPokemon().removeHeldItem();
            }
        } catch (error) { }
    });

    stage.until(600, function () { return stage.casts("recycle", caster) > 0; }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("recycle", caster) > 0, "回收利用被放出来了");
            stage.expect(heldNow().indexOf("oran_berry") >= 0, "回收后那件持有物回到了手里");
            stage.note("丢失前规则已把树果记进个体状态；回收成功即清空记忆，和原生一样一次一件。",
                { casts: stage.casts("recycle", caster), held: heldNow() });
            stage.done();
        });
    }, "失去后回收");
});
