/**
 * 超级角击 / megahorn 的出手方式。
 *
 * 核心念头：**低头刨地蓄足势，然后沿一条又长又窄的直线把角狠狠送进去**——全族最长、最重、起手最久的一记重刺。
 * 正面只有一条很窄的角线，侧身站开或趁蓄势走开就能让这一记落空；扎中最前面那个目标后：
 *   深植式把角留在伤口里、目标被短暂钉住（减速）；甩角式第二拍把角猛甩出来，补一记并把目标向上向后抛飞。
 *
 * 三幕：
 *   起（windup，提交前）：低头、后腿刨地、角尖压低，只播预告；这段时间可被打断，也是对手的闪避窗口。
 *   刺（thrust）：提交后朝前趟出 `rush` 格，沿身前 `reach` 格长、`horn` 半宽的窄线取第一个目标结算 `gore` 接触伤害。
 *   收（pin 或 toss）：深植式给目标挂 `minecraft:slowness` 钉住 `pinTicks`；甩角式延迟第二拍补 `rip` 并挑飞目标。
 *
 * 与同族分开：直冲钻是贴地钻穿一整排并犁沟，毒击是带毒的近身延长，百万吨重拳是沿地面的直拳推离；
 * 超级角击是唯一「长蓄势 + 单点窄线 + 把目标挑到空中或钉住」的重刺。
 *
 * 配置 `rip` 由公式改威力、抛飞与钉住时长，由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const megahornScene = "world_combat:move_megahorn";
    const megahornHitText = "world_combat.move.megahorn.text.hit";
    const megahornPinText = "world_combat.move.megahorn.text.pin";
    const megahornTossText = "world_combat.move.megahorn.text.toss";
    const megahornMissText = "world_combat.move.megahorn.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function megahornHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 角线判定与画面共用的四个顶点：从身体高度沿方向铺 `reach` 格、半宽 `half` 的窄带。 */
    function megahornLane(origin: CombatPoint, heading: CombatPoint, reach: number, half: number): number[][] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const near = origin.plus(WorldCombat.point(0, -0.1, 0));
        const far = near.plus(heading.scale(reach));
        const a = near.plus(side.scale(half)), b = near.minus(side.scale(half));
        const c = far.minus(side.scale(half)), d = far.plus(side.scale(half));
        return [[a.x(), a.y(), a.z()], [b.x(), b.y(), b.z()], [c.x(), c.y(), c.z()], [d.x(), d.y(), d.z()]];
    }

    define({
        id: "megahorn",
        cooldownParameter: "recharge",
        name: "Megahorn",
        description: "Using its tough and impressive horn, the user rams into the target with no letup.",
        uses: ["长蓄势换一记最重的单点直刺", "把正面的目标挑到空中、脱离阵地", "深植式钉住目标给队友创造机会"],
        kind: "enemy",
        range: 3.4,
        maxRange: 4.6,
        prepare: 15,
        active: 16,
        recover: 12,
        cooldown: 40,
        maximumTicks: 220,
        style: "stab",
        defaults: { rip: false, ai: { maxChase: 7, huntTough: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("megahorn", "reach", pokemon), geometry: "line", style: "stab", color: 0xD9A63A,
                label: config && config.rip === true ? "甩角式" : "深植式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["megahorn"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("megahorn", "charge", context)),
                recover: Math.round(p("megahorn", "aftercast", context)),
                cooldown: Math.round(p("megahorn", "recharge", context)),
                active: skills["megahorn"].active,
                range: p("megahorn", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_megahorn:windup", megahornScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, reach: p("megahorn", "reach", action),
                    rip: config && config.rip === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const rip = config && config.rip === true;
            const heading = megahornHeading(aim(action));
            const reach = Math.max(2.4, p("megahorn", "reach", action));
            const horn = Math.max(0.24, p("megahorn", "horn", action));
            const rush = Math.max(0, p("megahorn", "rush", action));
            const power = p("megahorn", "gore", action);
            const shards = Math.max(8, Math.round(p("megahorn", "shards", action)));
            const scale = Math.max(0.7, Math.min(1.9, reach / 3.4));
            const intensity = Math.max(0.7, Math.min(2.4, power / 120));

            const self = world.observe(actor);
            if (self !== null && rush > 0.05) {
                const target = action.target();
                const body = target !== null && world.valid(target) ? world.observe(target) : null;
                const delta = body !== null ? body.position().minus(self.position()) : heading.scale(rush);
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const advance = Math.min(rush, Math.max(0, flat - reach * 0.6));
                if (advance > 0.02) world.displace(actor, heading.scale(advance));
            }
            const moved = world.observe(actor);
            const origin = moved === null ? action.origin() : moved.position();
            const path = megahornLane(origin, heading, reach, horn);

            sound(action, "minecraft:item.trident.throw");
            WorldFeedback.emit(world, megahornScene, 1, origin,
                { moment: "thrust", path: path, reach: reach, horn: horn, shards: shards,
                    scale: scale, intensity: intensity, direction: [heading.x(), heading.y(), heading.z()] }, 18);

            const impact = action.trace(origin, origin.plus(heading.scale(reach)), horn);
            const target = impact.hitEntity() ? impact.target() : null;
            if (target === null || !hurt(action, target, "megahorn", power,
                { damage: damageSpec("megahorn", "gore"), contact: true })) {
                WorldFeedback.emit(world, megahornScene, 1, origin,
                    { moment: "whiff", reach: reach, scale: scale, intensity: intensity }, 18);
                WorldFeedback.text(world, origin.plus(heading.scale(reach)).plus(WorldCombat.point(0, 1.1, 0)), megahornMissText, [], 22);
                sound(action, "minecraft:entity.player.attack.strong");
                done(action);
                return;
            }

            const landed = world.observe(target);
            const at = landed === null ? impact.position() : landed.position();
            WorldFeedback.emit(world, megahornScene, 1, at,
                { moment: "pierce", target: String(target.ref()), shards: shards, scale: scale, intensity: intensity }, 22);
            sound(action, "cobblemon:impact.bug");

            if (!rip) {
                const pinTicks = Math.max(10, Math.round(p("megahorn", "pinTicks", action)));
                const pinLevel = Math.max(0, Math.round(p("megahorn", "pinLevel", action)));
                world.marker(target, "minecraft:slowness", pinTicks, pinLevel);
                WorldFeedback.emit(world, megahornScene, 1, at,
                    { moment: "pin", target: String(target.ref()), pinTicks: pinTicks, pinLevel: pinLevel,
                        scale: scale, intensity: intensity }, Math.min(40, pinTicks));
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), megahornPinText, [pinLevel], 26);
                done(action);
                return;
            }

            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), megahornHitText, [Math.round(power)], 24);
            action.after(3, function (next: CombatAction) {
                const scope = next.world();
                if (scope.valid(target)) {
                    const ripPower = p("megahorn", "rip", next);
                    const fling = Math.max(0.2, p("megahorn", "fling", next));
                    const flingUp = Math.max(0.1, p("megahorn", "flingUp", next));
                    const body = scope.observe(target);
                    const where = body === null ? at : body.position();
                    hurt(next, target, "megahorn", ripPower,
                        { damage: damageSpec("megahorn", "gore"), contact: true });
                    if (scope.valid(target)) scope.displace(target, heading.scale(fling));
                    if (scope.valid(target)) scope.motion(target, WorldCombat.point(0, flingUp, 0), false);
                    WorldFeedback.emit(scope, megahornScene, 1, where,
                        { moment: "toss", target: String(target.ref()), fling: fling, flingUp: flingUp,
                            shards: shards, scale: scale, intensity: intensity }, 22);
                    WorldFeedback.text(scope, where.plus(WorldCombat.point(0, 1.3, 0)), megahornTossText, [], 24);
                    scope.sound("minecraft:entity.player.attack.knockback", where, 16, "{}");
                }
                done(next);
            });
        }
    });
}
