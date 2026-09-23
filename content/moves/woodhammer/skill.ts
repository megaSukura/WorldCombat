/**
 * 木槌 / woodhammer 的出手方式。
 *
 * 核心念头：把躯体绷硬成一柄木槌，抬起身体再整副砸下去——落地的一刻地面也裂开，被砸实的人被压得踉跄。
 * 它是这一族里最慢、最重、唯一把地面砸裂的一招；体重与防御既进威力、也进反震与损伤的地表。
 *
 * 两幕（砸空多一幕）：
 *   起（windup，提交前）：躯体绷硬、抬起，只播预告。
 *   砸（rise → slam → impact / whiff）：提交后先把身体抬起 rise 高度，再朝目标位置砸下去；
 *       砸到活体即结算 timber 接触伤害（共享反震）、把人沿砸击方向撞飞 shove 格，并在下一刻把速度压下
 *       stagger 级；无论砸中还是砸空，落点周围的地表都被震裂 cracks 块，停留 crackTicks 后原方块回来。
 *
 * 与同族分开：舍身冲撞是横向猛撞、撞完双方被弹开；勇鸟猛攻是一条长俯冲线穿过目标；波动冲裹水撞人。
 * 木槌的辨识点是砸出来的那一圈地裂与木屑。配置 root（扎根式）由 resolve 改时序、由公式改数值。
 */
namespace PokemonSkills {
    const woodhammerScene = "world_combat:move_woodhammer";
    const woodhammerHitText = "world_combat.move.woodhammer.text.hit";
    const woodhammerWhiffText = "world_combat.move.woodhammer.text.whiff";

    /** 被砸到的地表形态：泥土类砸成粗土，石头类砸出圆石；其余不动。 */
    function woodhammerCracked(id: string): string {
        if (id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block") return "minecraft:coarse_dirt";
        if (id === "minecraft:stone" || id === "minecraft:granite" || id === "minecraft:diorite" ||
            id === "minecraft:andesite" || id === "minecraft:tuff" || id === "minecraft:deepslate" ||
            id === "minecraft:gravel") return "minecraft:cobblestone";
        return "";
    }

    /** 把落点周围的地表砸裂；只动地表的可换方块，到期原方块回来。返回实际砸裂的块数。 */
    function woodhammerScar(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
        var cells: any[] = [], baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        var limit = Math.max(4, Math.round(cap)), r = Math.ceil(radius), inner = Math.max(0.3, radius * 0.12);
        for (var dx = -r; dx <= r && cells.length < limit; dx++) for (var dz = -r; dz <= r && cells.length < limit; dz++) {
            var distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius || distance < inner) continue;
            var x = baseX + dx, z = baseZ + dz;
            for (var dy = 1; dy >= -2; dy--) {
                var y = baseY + dy;
                var block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                var id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                var surface = woodhammerCracked(id);
                if (surface !== "" && surface !== id) cells.push({ x: x, y: y, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        freeMovement: true,
        id: "woodhammer",
        cooldownParameter: "recharge",
        name: "Wood Hammer",
        description: "把躯体绷硬成一柄木槌，抬起身体再整副砸下：命中造成重击并把目标砸飞、压下一段速度，落点周围的地表被震裂（稍后恢复），自己承担反震。防御直接参与威力，硬体也减轻反伤。",
        uses: ["砸实一个贴身的厚目标", "把目标砸得踉跄、削掉速度", "在落点砸出一圈地裂，标记这一击的位置"],
        kind: "enemy",
        range: 2.6,
        maxRange: 4.6,
        prepare: 12,
        active: 28,
        recover: 12,
        cooldown: 50,
        style: "slam",
        maximumTicks: 160,
        defaults: { root: false, ai: { maxChase: 7, minHealth: 0.35, preferHeld: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("woodhammer", "collisionRadius", pokemon) * 1.6, geometry: "area", style: "slam",
                color: 0x7A8B4A, label: config && config.root === true ? "扎根式木槌" : "木槌" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["woodhammer"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("woodhammer", "tempo", context)),
                recover: Math.round(p("woodhammer", "aftercast", context)),
                cooldown: Math.round(p("woodhammer", "recharge", context)),
                active: skills["woodhammer"].active,
                range: p("woodhammer", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_woodhammer:harden", woodhammerScene, 1, action.origin(),
                JSON.stringify({ moment: "harden", root: !!(config && config.root) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(woodhammerScene);
            const world = action.world();
            const actor = action.actor();
            const rise = p("woodhammer", "rise", action);
            const pace = p("woodhammer", "pace", action);
            const radius = p("woodhammer", "collisionRadius", action);
            const minimumMove = p("woodhammer", "minimumMove", action);
            const power = p("woodhammer", "timber", action);
            const recoil = p("woodhammer", "recoil", action);
            const shove = p("woodhammer", "shove", action);
            const stagger = Math.max(1, Math.round(p("woodhammer", "stagger", action)));
            const splinters = Math.round(p("woodhammer", "splinters", action));
            const cracks = Math.max(4, Math.round(p("woodhammer", "cracks", action)));
            const crackTicks = Math.max(40, Math.round(p("woodhammer", "crackTicks", action)));
            const root = !!(config && config.root);
            const scale = radius / 0.62;
            const intensity = Math.max(0.6, Math.min(2.6, power / 115));
            const target = action.target();
            const crackRadius = 1.0 + Math.min(2.0, cracks * 0.06);
            const direction = aim(action);
            let settled = false, raised = 0, pending: string[] = [];

            WorldFeedback.emit(world, woodhammerScene, 1, action.origin(),
                { moment: "harden", splinters: splinters, scale: scale, intensity: intensity, root: root ? 1 : 0 }, 40);
            sound(action, "minecraft:block.wood.hit");
            sound(action, "minecraft:entity.iron_golem.attack");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (!pending.length) { movementScenes.finish(current, done); return; }
                const refs = pending.slice();
                // 等这一发的伤害结算完的下一刻再压速度（与伤害同一刻会互相顶掉）。
                current.after(1, function (next: CombatAction) {
                    const scope = next.world();
                    for (let i = 0; i < refs.length; i++) {
                        const victim = scope.actor(refs[i]);
                        if (victim !== null && scope.valid(victim)) NativeEffects.boost(scope, victim, "spe", -stagger);
                    }
                    movementScenes.finish(next, done);
                });
            }

            /** 落地：无论是砸中人还是砸空，落点周围的地表都裂开。 */
            function crash(current: CombatAction, at: CombatPoint, hit: CombatImpact | null): void {
                movementScenes.stop(current);
                const scope = current.world();
                const placed = woodhammerScar(scope, at, crackRadius, crackTicks, cracks);
                const body = scope.observe(actor);
                if (body !== null) {
                    WorldFeedback.emit(scope, woodhammerScene, 1, at,
                        { moment: hit !== null ? "impact" : "whiff", target: hit !== null && hit.target() !== null ? String(hit.target()!.ref()) : "",
                            splinters: splinters, cells: placed, scale: scale, intensity: intensity }, 30);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                        hit !== null ? woodhammerHitText : woodhammerWhiffText, [], 26);
                }
                sound(current, "minecraft:block.wood.break");
                sound(current, "minecraft:block.anvil.land");
                finish(current);
            }

            function slam(current: CombatAction, guard: number): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const here = self.position();
                const goal = target !== null && scope.observe(target) !== null ? scope.observe(target)!.position() : action.targetPosition();
                const heading = goal.minus(here);
                if (guard > 50 || heading.length() < 0.05) { crash(current, here, null); return; }
                const step = Math.min(pace, heading.length());
                const delta = heading.unit().scale(step);
                const swept = sweepStep(current, delta, radius);
                const impactHit = swept.hit;
                if (impactHit.hitEntity() && impactHit.target() !== null && !scope.friendly(impactHit.target()!)) {
                    const victim = impactHit.target()!, point = impactHit.position();
                    const landed = impact(current, impactHit, "woodhammer", power,
                        { damage: damageSpec("woodhammer", "timber"), contact: true, recoil: recoil });
                    if (landed && scope.valid(victim)) {
                        const away = WorldCombat.point(direction.x(), 0, direction.z());
                        scope.displace(victim, (away.length() < 0.05 ? direction : away).unit().scale(shove));
                        pending.push(String(victim.ref()));
                    }
                    crash(current, point, impactHit);
                    return;
                }
                const moved = swept.moved + (impactHit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                if (moved < minimumMove) { crash(current, here, null); return; }
                movementScenes.show(current, "fall", here, { moment: "fall", splinters: splinters, scale: scale, intensity: intensity });
                current.after(1, function (next) { slam(next, guard + 1); });
            }

            function raise(current: CombatAction, climbed: number): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                if (climbed >= rise - 0.05) { slam(current, 0); return; }
                const lift = Math.min(pace * 1.2, rise - climbed);
                const moved = scope.displace(actor, WorldCombat.point(0, lift, 0));
                if (moved < lift * 0.5) { slam(current, 0); return; }
                current.after(1, function (next) { raise(next, climbed + moved); });
            }

            raise(action, 0);
        }
    });
}
