// 沥青射击的可执行设计说明：一只只会沥青射击的宝可梦隔一段空地泼洒一只不会动、不会还手的铁傀儡。
// 必然事实：本招被提交过；目标带上共享身份 world_combat:status/tarshot；目标移动速度属性下降；落点留下沥青装饰方块。
// 火焰弱点 ×2、水冲掉、被打到即散开、大泼覆盖多人、装饰块不替换承重块这些设计事实不是本场景的必然事实，写进 note。
namespace TarshotScenario {
    export let caster = "", fireAlly = "", ordinaryAlly = "";
    export let scores: { alone: number; fireMove: number; ordinary: number } | null = null;
    CompanionBehavior.reports.define({ id: "checks:tarshot-equipped-fire", apply: report => {
        const context = report.context;
        if (scores || !caster || String(context.facts.self.ref).indexOf(caster) !== 0) return;
        const item = context.capabilities.filter(entry => entry.data.move === "tarshot")[0];
        const enemies = (context.facts.nearby as WorldMethods.Subject[]).filter(entry => !entry.friendly && entry.health > 0);
        const target = enemies[0], rule = CompanionBehavior.uses.get("tarshot");
        if (!item || !target || !rule || !rule.priority) return;
        const nearby = context.facts.nearby as WorldMethods.Subject[];
        if (!nearby.some(entry => String(entry.ref).indexOf(fireAlly) === 0) || !nearby.some(entry => String(entry.ref).indexOf(ordinaryAlly) === 0)) return;
        function score(friend: string): number {
            const frame: WorldBehavior.Context = { ...context, facts: { ...context.facts,
                nearby: nearby.filter(entry => !entry.friendly || friend && String(entry.ref).indexOf(friend) === 0) } };
            return rule!.priority!(frame, item, target);
        }
        scores = { alone: score(""), fireMove: score(fireAlly), ordinary: score(ordinaryAlly) };
    } });
}
Smoke.scenario("tarshot", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.watch([-4, 0, -4], [4, 3, 4]);
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "coalossal", level: 40, moves: ["tarshot"], at: [-4, 0, 0] });
    const fireAlly = stage.pokemon({ species: "clefable", level: 40, moves: ["flamethrower"], at: [-4, 0, 4] });
    const ordinary = stage.mob({ type: "minecraft:cow", at: [-4, 0, -4] });
    stage.team("tarshot-allies", [caster, fireAlly, ordinary]); stage.noai(fireAlly, ordinary);
    TarshotScenario.caster = caster.ref; TarshotScenario.fireAlly = fireAlly.ref; TarshotScenario.ordinaryAlly = ordinary.ref;
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var baseSpeed = stage.attribute(foe, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    function tar(): number {
        return stage.changedBlocks().filter(function (cell) { return cell.after === "minecraft:black_carpet"; }).length;
    }
    stage.until(700, function () {
        return stage.casts("tarshot", caster) >= 1 && stage.hadMobEffect(foe, "world_combat:status/tarshot")
            && stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed - 0.001 && tar() > 0 && TarshotScenario.scores !== null;
    }, function () {
        stage.expect(stage.casts("tarshot", caster) >= 1, "caster committed tar shot");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/tarshot"), "the target carried the shared tar identity");
        stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the tar slowed the target's movement");
        stage.expect(tar() > 0, "a rented decorative tar patch was left above the ground at the landing point");
        const scores = TarshotScenario.scores!;
        stage.expect(scores.fireMove - scores.alone === 14, "a non-Fire ally's equipped Fire attack supplies the synergy bonus");
        stage.expect(scores.ordinary === scores.alone, "the Fire-type caster without a Fire move and the ordinary ally supply no guessed Fire attack");
        stage.note("actual equipped-move AI scoring", scores);
        stage.note("the doubled Fire weakness is settled in PokemonDamage.metadata from the shared tarshot identity; the aim-at-ground form, the wide splash, the water wash-off, the on-fire flare and the fact that the patch is decoration above air (not a replaced load-bearing block) are not asserted here.", {
            casts: stage.casts("tarshot", caster),
            baseSpeed: baseSpeed,
            speed: stage.attribute(foe, "minecraft:generic.movement_speed"),
            tarBlocks: tar(),
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "tar shot coats the target");
});
