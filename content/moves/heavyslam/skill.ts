/**
 * 重磅冲撞 / heavyslam 的出手方式。
 *
 * 核心念头：把自己整副钢甲身躯当成武器砸下去。出手不靠力气，靠**分量比**——自己比对手越重，这一下越狠。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：沉肩压腿，钢甲上掠过一层冷光。
 *   跃（ascend → descend）：沿目标方向腾空翻身，从上方落向落点；落点在起跳瞬间锁定，对手在腾空期走开就躲过。
 *   砸（crash）：以身体砸在落点，范围里所有敌人各按**自己的体重**结算 `crush` 伤害并被冲开，
 *       地面被砸出一个短命的坑（terrain 租借，linger，到期归还）。
 *
 * 与 heatcrash 分开：重磅冲撞只讲分量与地面，不带火、不留灼烧；玩家凭落点有没有火与烟一眼分清。
 * 伤害按每个目标各自的体重比分别求值。提交后才触碰世界。
 */
namespace PokemonSkills {
    const heavyslamScene = "world_combat:move_heavyslam";
    const heavyslamHitText = "world_combat.move.heavyslam.text.hit";
    const heavyslamMissText = "world_combat.move.heavyslam.text.miss";

    /** 地面被砸碎：内圈铺安山岩、外圈铺圆石；租借，到期原方块回来。 */
    function heavyslamCrater(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
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
                const surface = distance <= radius * 0.45 ? "minecraft:andesite" : "minecraft:cobblestone";
                if (id !== surface) cells.push({ x: x, y: y, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    /** 用某个具体目标的事实求这一次冲撞的威力；双方体重只有在这里才互相读得到。 */
    function heavyslamPower(action: CombatAction, world: CombatWorld, target: CombatActor, values: any): number {
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["heavyslam"],
            detail: { values: values }, world: world, actor: action.actor(), target: { world: world, actor: target } };
        return p("heavyslam", "crush", context);
    }

    define({
        freeMovement: true,
        id: "heavyslam",
        name: "Heavy Slam",
        description: "把自己整副身躯从上方砸下去：自己比对手越重，这一下越狠。落点一圈冲击把周围敌人一起震开、按各自的体重结算伤害，地面被砸出一个短命的坑。沉坠式更集中更重，冲跳式跃得更远、顶得更开。",
        uses: ["用分量压垮比自己轻的目标", "落地震开挤在一起的一群敌人", "在地面砸出一个短命的坑"],
        kind: "enemy",
        range: 4,
        maxRange: 6.5,
        prepare: 9,
        active: 40,
        recover: 12,
        cooldown: 46,
        style: "drop",
        defaults: { anchor: false, ai: { maxChase: 8, crowd: true, minRatio: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("heavyslam", "landRadius", pokemon), geometry: "area", style: "drop", color: 0xB8B8C0, label: "重磅冲撞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["heavyslam"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const anchor = !!(config && config.anchor);
            return {
                prepare: Math.max(1, Math.round(p("heavyslam", "prepare", context))),
                recover: Math.round(p("heavyslam", "recover", context)) + (anchor ? 3 : 0),
                cooldown: Math.round(p("heavyslam", "cooldown", context)) + (anchor ? 6 : 0),
                range: p("heavyslam", "leap", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_heavyslam:windup", heavyslamScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", anchor: !!(config && config.anchor) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const landing = action.targetPosition();
            const origin = action.origin();
            const radius = p("heavyslam", "landRadius", action);
            const hop = p("heavyslam", "hop", action);
            const air = Math.max(8, Math.round(p("heavyslam", "airTicks", action)));
            const leap = p("heavyslam", "leap", action);
            const shove = p("heavyslam", "shove", action);
            const craterRadius = p("heavyslam", "craterRadius", action);
            const craterTicks = Math.round(p("heavyslam", "craterTicks", action));
            const scale = radius / 2.0;
            const delta = landing.minus(origin);
            const flat = WorldCombat.point(delta.x(), 0, delta.z());
            const heading = flat.length() < 1e-6 ? aim(action) : flat.unit();
            const approach = Math.max(0, Math.min(leap, flat.length() - 0.5));
            const rise = Math.max(2, Math.floor(air / 2));
            const fall = Math.max(2, air - rise);
            const horizontal = approach / air;
            const up = hop / rise;
            const down = hop / fall;

            WorldFeedback.emit(world, heavyslamScene, 1, origin, { moment: "leap", scale: scale, hop: hop }, 26);
            sound(action, "minecraft:entity.iron_golem.attack");

            function crash(current: CombatAction): void {
                const scope = current.world();
                const region = WorldGeometry.ring(landing, 0, radius, { below: 2.5, above: 3 });
                let hits = 0;
                WorldGeometry.selectEnemies(scope, region, function (target, facts) {
                    const power = heavyslamPower(current, scope, target, config);
                    const landed = hurt(current, target, "heavyslam", power,
                        { damage: damageSpec("heavyslam", "crush"), contact: true });
                    hits++;
                    if (landed && scope.valid(target)) {
                        const away = facts.position().minus(landing);
                        if (away.length() >= 0.05) scope.displace(target, away.unit().scale(shove));
                    }
                    WorldFeedback.emit(scope, heavyslamScene, 1, facts.position(),
                        { moment: "impact", target: String(target.ref()), intensity: Math.max(0.6, Math.min(2.4, power / 90)) }, 28);
                });
                heavyslamCrater(scope, landing, craterRadius, craterTicks);
                WorldFeedback.emit(scope, heavyslamScene, 1, landing,
                    { moment: "crash", scale: scale, bursts: 22 + hits * 10, intensity: hits > 0 ? 1.6 : 0.9, hits: hits }, 34);
                sound(current, "minecraft:item.mace.smash_ground_heavy");
                sound(current, "minecraft:block.anvil.land");
                WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.4, 0)),
                    hits > 0 ? heavyslamHitText : heavyslamMissText, hits > 0 ? [hits] : [], 28);
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
