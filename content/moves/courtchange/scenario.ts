/**
 * 换场 / courtchange 的可执行设计说明。
 *
 * 场面：一只只会「换场」的魔幻假面喵（Meowscarada，40 级）站在一只被点住的铁傀儡旁；斜前方是一只只会「撒菱」的
 *   穿山王（Sandslash，40 级，与施法者互为敌人）。穿山王把菱撒向施法者，在施法者脚下留下一处敌方领域
 *   （world_combat:field）；施法者扫到它之后放出换场，把它过户过来。
 * 依赖：世界里没有可直接生成领域的命令，领域只由各领域招式铺出；因此本场景需要与 `content/moves/spikes`
 *   一起装配（判定仍只读 courtchange 自己的轨迹）。
 * 必然事实：本招被提交过（`stage.casts`）。实际有几处领域被接管／交出取决于穿山王撒了几层，
 *   写进 note 供读轨迹判断（smoke 不读取领域效果本身）。
 */
Smoke.scenario("courtchange", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "meowscarada", level: 40, moves: ["courtchange"], at: [-2, 0, 0] });
    var bait = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "sandslash", level: 40, moves: ["spikes"], at: [4, 0, 0] });
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    // 施法者与穿山王互为敌人：穿山王把菱撒向施法者，撒出的敌方领域就落在施法者脚下；
    // 施法者因此有明确的威胁与一处扫得到的敌方领域，才会选择换场。
    stage.hostile(caster, foe);
    stage.hostile(caster, bait);
    stage.hostile(foe, bait);
    stage.until(2400, function () {
        return stage.casts("courtchange", caster) > 0;
    }, function () {
        stage.expect(stage.casts("courtchange", caster) > 0, "court change was committed after an enemy field appeared nearby");
        stage.note("换场扫出中心半径内的所有共享领域效果：敌方的过户给施法者、我方的过户给最近的敌人，领域只换主人、规则与剩余时长不变。穿山王撒在施法者身边的尖刺因此转而扎它自己。实际接管／交出几处随穿山王叠了几层而变，是时机结果；换场半径随等级与体型、光点随特攻变化，速换与稳换各有代价。", {
            courtCasts: stage.casts("courtchange", caster),
            spikesCasts: stage.casts("spikes", foe),
            casterAlive: caster.alive(),
            foeAlive: foe.alive(),
            baitAlive: bait.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "court change flips the field");
});
