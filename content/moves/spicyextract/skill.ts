/**
 * 辣椒精华 / spicyextract 的执行组织。
 *
 * 核心念头：把一管辣椒精华甩到对手身上。瓶子飞出、落地炸成一片呛人辣雾——被辣到的敌人攻击暴涨、防御被烧穿，
 * 你给全队开出一段「揍它」的窗口；辣雾还在原处留一会儿，新走进来的人也会被辣一次。
 * 这里的代价很直白：它接下来打谁都很疼。
 *
 * 出手：短起手（windup 播红绿星火）后提交，按配置决定是贴脸浓缩还是远处稀释。
 * 掷出：LivingActions.projectile 的原生投射物负责飞行与碰撞，外观是一只发光的精华瓶。
 * 爆开：落点半径内 selectEnemies 全部结算 NativeEffects.boost(atk,+gift) 与 boost(def,-shred)；
 *       表现与判定读同一个半径（data.scale = 实际半径/参考半径）。
 * 残留：WorldEffects.field 的辣雾（规则 world_combat:spicy_haze）里新进入的敌人各辣一次，同一目标只结算一次。
 * 反制：瓶子可能被打偏、掩体可以挡下；辣雾只作用到站在里面的人，走开就不再被辣。
 */
namespace PokemonSkills {
    const spicyScene = "world_combat:move_spicyextract";
    const spicyBurnText = "world_combat.move.spicyextract.text.burn";

    /** 辣一次：抬高攻击、烧穿防御，并把这张「窗口」画在目标身上。 */
    function spicyBurn(world: CombatWorld, actor: CombatActor, gift: number, shred: number, scale: number): void {
        NativeEffects.boost(world, actor, "atk", gift);
        NativeEffects.boost(world, actor, "def", -shred);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, spicyScene, 1, body.position(),
            { moment: "burn", target: String(actor.ref()), gift: gift, shred: shred, scale: scale }, 28);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), spicyBurnText, [gift, shred], 36);
    }

    /** 落点爆开：半径内所有非友方各辣一次；辣雾按实际半径铺开并残留。返回被辣到的人数。 */
    function spicyBurst(world: CombatWorld, point: CombatPoint, gift: number, shred: number, blast: number, linger: number): number {
        const scale = blast / spicyReferenceRadius;
        let affected = 0;
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, blast), function (actor) {
            spicyBurn(world, actor, gift, shred, scale);
            affected++;
        });
        WorldFeedback.emit(world, spicyScene, 1, point,
            { moment: "burst", scale: scale, drops: Math.round(40 + blast * 30), gift: gift, shred: shred }, 34);
        WorldFeedback.emit(world, spicyScene, 1, point,
            { moment: "haze", scale: scale, drops: Math.round(30 + blast * 20) }, Math.max(20, Math.round(linger)));
        WorldEffects.field(world, spicyHazeRule, point, blast, { gift: gift, shred: shred }, linger);
        world.sound("minecraft:block.glass.break", point, 18, "{}");
        return affected;
    }

    // 辣雾规则：新进入的非友方各辣一次；同一目标在同一片雾里只结算一次。
    WorldEffects.fieldRule(spicyHazeRule, {
        enter: function (world, actor, field) {
            if (world.friendly(actor)) return;
            const data = field.data || {}, ref = String(actor.ref());
            const hit = data.hit || (data.hit = {});
            if (hit[ref]) return;
            hit[ref] = true;
            const gift = Math.max(1, Math.round(data.gift || 1)), shred = Math.max(1, Math.round(data.shred || 1));
            spicyBurn(world, actor, gift, shred, 1);
        }
    });

    define({
        id: "spicyextract",
        cooldownParameter: "wait",
        name: "辣椒精华",
        description: "放出极为辛辣的精华。对手的攻击会大幅提高，防御会大幅降低。",
        uses: ["给全队开一个「揍它」的窗口", "把一只肉盾烧成玻璃炮", "在狭窄地形一次辣到一小簇敌人"],
        kind: "enemy",
        range: 6,
        maxRange: 12,
        prepare: 12,
        active: 1,
        recover: 8,
        cooldown: 90,
        style: "spice",
        defaults: { mix: 0, ai: { maxChase: 14, cluster: 2, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["spicyextract"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("spicyextract", "telegraph", context)),
                recover: Math.round(p("spicyextract", "aftermath", context)),
                cooldown: Math.round(p("spicyextract", "wait", context)),
                active: 1,
                range: config && config.mix === 1 ? 12 : 6
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_spicyextract:windup", spicyScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", mix: config.mix === 1 ? 1 : 0, target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const diluted = config && config.mix === 1;
            return { radius: diluted ? 12 : 6, geometry: "point", style: "spice", label: "辣椒精华" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const gift = Math.max(1, Math.min(4, Math.round(p("spicyextract", "gift", action))));
            const shred = Math.max(1, Math.min(3, Math.round(p("spicyextract", "shred", action))));
            const blast = Math.max(1.2, Math.min(3.8, p("spicyextract", "blast", action)));
            const linger = Math.max(40, Math.min(120, Math.round(p("spicyextract", "linger", action))));
            const speed = Math.max(0.4, p("spicyextract", "throwSpeed", action));
            const collision = Math.max(0.15, p("spicyextract", "collision", action));
            const gravity = p("spicyextract", "gravity", action);
            let bursted = false;
            function burst(current: CombatAction, point: CombatPoint): void {
                if (bursted) return;
                bursted = true;
                spicyBurst(current.world(), point, gift, shred, blast, linger);
            }
            sound(action, "minecraft:entity.experience_bottle.throw");
            LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: collision, gravity: gravity, lifetime: 80,
                appearance: { item: "minecraft:splash_potion", scale: 0.9, glow: true },
                impact: function (current, hit) { burst(current, hit.position()); }
            }, function (current) {
                burst(current, current.targetPosition());
                done(current);
            });
        }
    });
}
