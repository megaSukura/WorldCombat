/**
 * 高温重压 / heatcrash 的出手方式。
 *
 * 核心念头：与重磅冲撞同形不同料——把自己整副**燃着火的**身躯砸下去。分量在这里变成火：自己越压过对手，
 * 砸得越狠、也越容易把对手点着；落点被烤成一片短命的焦土，走进去会烫脚。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：全身火苗卷起来。
 *   跃（ascend → descend）：带着火尾沿目标方向腾空，从上方落向起跳瞬间锁定的落点。
 *   砸（crash）：以身体砸落，范围里每个敌人各按**自己的体重**结算 `crush` 伤害并被冲开；主目标可能被点着
 *       （共享灼烧身份，按体重比掷概率），命中瞬间身上起一段明火；落点烤成短命焦土（terrain 租借，linger）。
 *
 * 与 heavyslam 分开：这一招把重量变成火，玩家凭落点那片岩浆块与目标身上的火一眼分清。
 * 伤害按每个目标各自的体重比分别求值。提交后才触碰世界。
 */
namespace PokemonSkills {
    const heatcrashScene = "world_combat:move_heatcrash";
    const heatcrashHitText = "world_combat.move.heatcrash.text.hit";
    const heatcrashMissText = "world_combat.move.heatcrash.text.miss";

    /** 落点被烤焦：地表换成岩浆块；租借，到期原方块回来。 */
    function heatcrashScorch(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [];
        const r = Math.ceil(radius);
        const cx = Math.floor(centre.x()), cz = Math.floor(centre.z()), cy = Math.floor(centre.y());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius) continue;
            const x = cx + dx, z = cz + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const y = cy + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                if (id !== "minecraft:magma_block") cells.push({ x: x, y: y, z: z, block: "minecraft:magma_block" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    /** 用某个具体目标的事实求这一次冲撞的威力；双方体重只有在这里才互相读得到。 */
    function heatcrashPower(action: CombatAction, world: CombatWorld, target: CombatActor, values: any): number {
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["heatcrash"],
            detail: { values: values }, world: world, actor: action.actor(), target: { world: world, actor: target } };
        return p("heatcrash", "crush", context);
    }

    define({
        id: "heatcrash",
        name: "Heat Crash",
        description: "The user slams into the target with its flame-covered body. The more the user outweighs the target, the greater the move's power.",
        uses: ["用分量压垮比自己轻的目标并把火压上去", "落地烧出一片会烫脚的焦土", "对可燃的目标点起持续的灼烧"],
        kind: "enemy",
        range: 4,
        maxRange: 6.3,
        prepare: 9,
        active: 40,
        recover: 11,
        cooldown: 44,
        style: "drop",
        defaults: { scorch: false, ai: { maxChase: 8, opening: true, minRatio: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("heatcrash", "landRadius", pokemon), geometry: "area", style: "fire", color: 0xE0662A, label: "高温重压" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["heatcrash"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const scorch = !!(config && config.scorch);
            return {
                prepare: Math.max(1, Math.round(p("heatcrash", "prepare", context))),
                recover: Math.round(p("heatcrash", "recover", context)) + (scorch ? 3 : 0),
                cooldown: Math.round(p("heatcrash", "cooldown", context)) + (scorch ? 8 : 0),
                range: p("heatcrash", "leap", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_heatcrash:windup", heatcrashScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scorch: !!(config && config.scorch) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const landing = action.targetPosition();
            const origin = action.origin();
            const radius = p("heatcrash", "landRadius", action);
            const hop = p("heatcrash", "hop", action);
            const air = Math.max(8, Math.round(p("heatcrash", "airTicks", action)));
            const leap = p("heatcrash", "leap", action);
            const shove = p("heatcrash", "shove", action);
            const chance = Math.max(0.05, Math.min(0.9, p("heatcrash", "burnChance", action)));
            const burnTicks = Math.max(40, Math.round(p("heatcrash", "burnTicks", action)));
            const igniteTicks = Math.max(8, Math.round(p("heatcrash", "igniteTicks", action)));
            const scorchRadius = p("heatcrash", "scorchRadius", action);
            const scorchTicks = Math.round(p("heatcrash", "scorchTicks", action));
            const scale = radius / 1.8;
            const delta = landing.minus(origin);
            const flat = WorldCombat.point(delta.x(), 0, delta.z());
            const heading = flat.length() < 1e-6 ? aim(action) : flat.unit();
            const approach = Math.max(0, Math.min(leap, flat.length() - 0.5));
            const rise = Math.max(2, Math.floor(air / 2));
            const fall = Math.max(2, air - rise);
            const horizontal = approach / air;
            const up = hop / rise;
            const down = hop / fall;

            WorldFeedback.emit(world, heatcrashScene, 1, origin, { moment: "leap", scale: scale, hop: hop }, 26);
            sound(action, "minecraft:item.firecharge.use");

            function crash(current: CombatAction): void {
                const scope = current.world();
                const region = WorldGeometry.ring(landing, 0, radius, { below: 2.5, above: 3 });
                let hits = 0;
                WorldGeometry.selectEnemies(scope, region, function (target, facts) {
                    const power = heatcrashPower(current, scope, target, config);
                    const landed = hurt(current, target, "heatcrash", power,
                        { damage: damageSpec("heatcrash", "crush"), contact: true });
                    hits++;
                    if (landed && scope.valid(target)) {
                        scope.ignite(target, igniteTicks);
                        if (scope.random() < chance) CombatStatus.inflict(scope, target, "burn", burnTicks);
                        const away = facts.position().minus(landing);
                        if (away.length() >= 0.05) scope.displace(target, away.unit().scale(shove));
                    }
                    WorldFeedback.emit(scope, heatcrashScene, 1, facts.position(),
                        { moment: "impact", target: String(target.ref()), intensity: Math.max(0.6, Math.min(2.4, power / 90)) }, 30);
                    if (landed && scope.valid(target))
                        WorldFeedback.emit(scope, heatcrashScene, 1, facts.position(),
                            { moment: "burn", target: String(target.ref()), embers: Math.round(20 + power * 0.12),
                                burnTicks: igniteTicks }, igniteTicks + 20);
                });
                heatcrashScorch(scope, landing, scorchRadius, scorchTicks);
                WorldFeedback.emit(scope, heatcrashScene, 1, landing,
                    { moment: "crash", scale: scale, scorch: scorchRadius / 1.8, bursts: 24 + hits * 10,
                        intensity: hits > 0 ? 1.7 : 0.9, hits: hits }, 36);
                sound(current, "minecraft:item.mace.smash_ground_heavy");
                sound(current, "minecraft:entity.blaze.shoot");
                WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.4, 0)),
                    hits > 0 ? heatcrashHitText : heatcrashMissText, hits > 0 ? [hits] : [], 28);
                done(current);
            }
            function descend(current: CombatAction, elapsed: number): void {
                if (elapsed >= fall) { crash(current); return; }
                current.world().displace(current.actor(), heading.scale(horizontal).plus(WorldCombat.point(0, -down, 0)));
                current.after(1, function (next: CombatAction) { descend(next, elapsed + 1); });
            }
            function ascend(current: CombatAction, elapsed: number): void {
                if (elapsed >= rise) { descend(current, 0); return; }
                current.world().displace(current.actor(), heading.scale(horizontal).plus(WorldCombat.point(0, up, 0)));
                current.after(1, function (next: CombatAction) { ascend(next, elapsed + 1); });
            }
            ascend(action, 0);
        }
    });
}
