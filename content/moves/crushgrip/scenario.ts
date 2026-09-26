/**
 * 捏碎 的可执行设计说明。
 *
 * 主场景（crushgrip，高举式）：唯一学习者雷吉奇卡斯（50 级）面对 6 格外一只生命调高、不会被一击捏死的僵尸，打开高举式。
 *   必然事实：同一动作的 grip/slam 真实回执、实际上升和落地；随后同一僵尸获得完全抗击退，只接受初握。
 *   目标被举起多高、是否被定身，写进 note 供读轨迹判断。
 * 次场景（crushgrip-stay，原地式）：默认原地式对一只僵尸；用于交互复看默认形态，烟测只跑主场景。
 */
namespace CrushgripScenario {
    export interface Hit { origin: string; action: number; segment: string; amount: number; tick: number; feet: number; peak: number; grounded: boolean; }
    export let caster = "", victim = "";
    export const hits: Hit[] = [];
    WorldCombat.on("checks:crushgrip-receipt", "world_combat:damage_applied", "", event => {
        const target = event.target(), data = JSON.parse(event.data());
        if (!caster || String(event.actor().ref()).indexOf(caster) !== 0 || !target || String(target.ref()).indexOf(victim) !== 0
            || data.move !== "crushgrip" || !(data.actual > 0) || !data.originInstance) return;
        const body = event.world().observe(target); if (body === null) return;
        hits.push({ origin: String(data.originInstance), action: data.action, segment: data.segment, amount: data.actual,
            tick: event.world().tick(), feet: body.boundsMin().y(), peak: body.boundsMin().y(), grounded: body.grounded() });
    });
    WorldCombat.on("checks:crushgrip-height", "world_combat:actor_tick", "", event => {
        if (!victim || String(event.actor().ref()).indexOf(victim) !== 0) return;
        const body = event.world().observe(event.actor()); if (body === null) return;
        hits.filter(hit => hit.segment === "grip" && !hits.some(other => other.origin === hit.origin && other.segment === "slam"))
            .forEach(hit => { hit.peak = Math.max(hit.peak, body.boundsMin().y()); });
    });
    export function pair(): Hit[] | null {
        for (const grip of hits) if (grip.segment === "grip") {
            const slam = hits.filter(other => other.origin === grip.origin && other.segment === "slam")[0];
            if (slam) return [grip, slam];
        }
        return null;
    }
}
Smoke.scenario("crushgrip", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("midnight");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "regigigas", level: 50, moves: ["crushgrip"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    CrushgripScenario.caster = caster.ref; CrushgripScenario.victim = foe.ref; CrushgripScenario.hits.length = 0;
    stage.command("attribute " + foe.ref.split("/")[0] + " minecraft:generic.max_health base set 900");
    stage.command("data merge entity " + foe.ref.split("/")[0] + " {Health:900f}");
    stage.hostile(caster, foe);
    stage.after(5, function () { stage.prefer(caster, "crushgrip", { hoist: true }); });
    stage.until(1600, function () { return CrushgripScenario.pair() !== null; }, function () {
        const pair = CrushgripScenario.pair()!, grip = pair[0], slam = pair[1];
        stage.expect(grip.action === slam.action && grip.origin === slam.origin, "grip and slam have the same host-issued execution");
        stage.expect(grip.amount > 0 && slam.amount > 0, "both authored damage segments actually landed");
        stage.expect(grip.peak - grip.feet > .1 && slam.grounded, "an actual rise preceded the actual native landing");
        stage.expect(slam.tick - grip.tick <= 40, "the observed grab, hold and slam complete as one short sequence");
        stage.note("Crushgrip's real execution receipts and native lift/landing", { grip: grip, slam: slam });
        stage.command("attribute " + foe.ref.split("/")[0] + " minecraft:generic.knockback_resistance base set 1");
        let refused: CrushgripScenario.Hit | null = null;
        stage.until(600, function () {
            refused = CrushgripScenario.hits.filter(hit => hit.segment === "grip" && hit.origin !== grip.origin)[0] || null;
            return refused !== null;
        }, function () {
            stage.setPp(caster, "crushgrip", 0);
            stage.after(35, function () {
                const hits = CrushgripScenario.hits.filter(hit => hit.origin === refused!.origin);
                stage.expect(hits.length === 1 && hits[0].segment === "grip", "full native movement resistance permits the grip but no fabricated slam");
                stage.expect(!stage.hasMobEffect(foe, "world_combat:rooted"), "a refused lift adds no landing root");
                stage.note("The same recipient at full resistance retained only its actual grip receipt", hits);
                stage.done();
            });
        }, "crushgrip respects a recipient that cannot be lifted");
    }, "crushgrip hoist lifts then slams");
});

Smoke.scenario("crushgrip-stay", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("midnight");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "regigigas", level: 50, moves: ["crushgrip"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("crushgrip") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("crushgrip") > 0, "crushgrip was committed");
        stage.expect(stage.damageTo(foe) > 0, "the grip dealt damage");
        stage.note("Stay form (default): one grip, no lift.", {
            casts: stage.casts("crushgrip"),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            casterAlive: caster.alive(), foeAlive: foe.alive()
        });
        stage.done();
    }, "crushgrip stay lands");
});
