/**
 * 岩石爆击 / rockblast 的出手方式。本族「2～5 连发硬物」的岩石型。
 *
 * 核心念头：**掀地碎岩、霰弹齐射**——施法者从脚下的地里掰出石块，一块接一块按弧线抛向瞄准的落区；
 *   每块真正撞上才结算一次主击，并在真正撞点崩起一蓬碎石尘。卖的是「岩石取自你脚下的世界」与「越近吃得越满」。
 *
 * 三幕（提交前只播预告）：
 *   起（charge）：脚下地面裂开、石块在身侧浮起，只播预告。
 *   射（volley → hit / ground）：提交后每 `gap` 刻抛出一块石头（带 `spread` 偏角、按 `arc` 弧坠）；
 *       石块是可见的方块投递（原生实体外观），材质取自施法者脚下（沙地→沙岩、深板岩→碎深板岩）。
 *   击（hit / ground / fade）：撞上敌人结算一次 `shard` 物理伤害并在真撞点崩起碎石尘；
 *       撞上硬面在原生方块格与表面崩尘、不造成伤害；空飞耗尽只淡出。取消每枚都替换地表材质。
 *
 * 与同族分开：种子机关枪是贴地直飞的小籽、飞弹针是追身细针、冰锥碎在目标身上、尖刺加农炮直线穿排；
 *   只有岩石爆击走弧线，并且在真实撞点留下碎石尘。
 *
 * 选取 `kind: "aim"`：实体、地面点或抬高的方向都能瞄，方向朝落区压；墙由原生投射物真实截获，
 *   命中权限仍由命中层判断。目标为 null 或中途离场时，后续石块按当刻瞄准继续抛出，不为空放提前收招。
 *
 * 每一块石头有独立 `strike`，同一块重复回执仍被去重；落区固定在实际 reach 内，目标退远不扩大弹程；
 * 空飞只读该弹 `projectilePosition` 的真实末点淡出，不拿瞄准方向或满射程点假造终点。
 * 配置 `boulder`（巨岩式）由公式改威力／投石数／散布与时序，并在代码里把巨岩投石数再次收在工作上限 3；提交后才触碰世界。
 */
namespace PokemonSkills {
    const rockblastScene = "world_combat:move_rockblast";
    /** 单块石头求解低弧时的最长飞行刻数；够覆盖本招射程内的低弧。 */
    const rockblastFlightTicks = 80;

    /** 把地表方块归到一个「岩石类」材质上：沙归沙岩、深板岩归碎深板岩，其余石质归圆石。 */
    function rockblastGroundMaterial(id: string): string {
        const value = String(id);
        if (value.indexOf("red_sand") >= 0) return "minecraft:red_sandstone";
        if (value.indexOf("sand") >= 0) return "minecraft:sandstone";
        if (value.indexOf("deepslate") >= 0) return "minecraft:cobbled_deepslate";
        if (value.indexOf("blackstone") >= 0) return "minecraft:blackstone";
        if (value.indexOf("basalt") >= 0) return "minecraft:basalt";
        if (value.indexOf("netherrack") >= 0) return "minecraft:netherrack";
        if (value.indexOf("tuff") >= 0) return "minecraft:tuff";
        if (value.indexOf("andesite") >= 0) return "minecraft:andesite";
        if (value.indexOf("diorite") >= 0) return "minecraft:diorite";
        if (value.indexOf("granite") >= 0) return "minecraft:granite";
        if (value.indexOf("terracotta") >= 0) return "minecraft:terracotta";
        if (value.indexOf("gravel") >= 0) return "minecraft:gravel";
        if (value.indexOf("ice") >= 0) return "minecraft:packed_ice";
        if (value.indexOf("obsidian") >= 0) return "minecraft:obsidian";
        if (value.indexOf("dirt") >= 0 || value.indexOf("podzol") >= 0 || value.indexOf("mycelium") >= 0) return "minecraft:dirt";
        return "minecraft:cobblestone";
    }

    /** 从身体中心向下读最近的一层实心方块，作为这一梭石头的材质来源；只往下看，不从头顶取。 */
    function rockblastSurface(world: CombatWorld, at: CombatPoint): string {
        for (let dy = 0; dy >= -3; dy--) {
            const block = world.block(WorldCombat.point(at.x(), at.y() + dy, at.z()));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava") continue;
            return id;
        }
        return "minecraft:stone";
    }

    /** 把弧线方向绕世界 Y 轴偏一个角度，做出霰弹的散布。 */
    function rockblastScatter(direction: CombatPoint, angle: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    /** 撞块面朝外法线；表现按它把碎石铺在真实碰撞面上，未给出具体方块面时返回 null。 */
    function rockblastFaceNormal(face: string): number[] | null {
        if (face === "up") return [0, 1, 0];
        if (face === "down") return [0, -1, 0];
        if (face === "north") return [0, 0, -1];
        if (face === "south") return [0, 0, 1];
        if (face === "west") return [-1, 0, 0];
        if (face === "east") return [1, 0, 0];
        return null;
    }

    define({
        id: "rockblast",
        cooldownParameter: "recharge",
        name: "Rock Blast",
        description: "从脚下的地里掰出石块，一块接一块按弧线抛向瞄准的落区：每块真正砸中才结算一次，并在真撞点崩起碎石尘。石块抛得散、贴脸才吃得满；可瞄实体、地面点或抬高的方向，墙会把石头真的截下来。巨岩式少而重、抛得更紧。",
        uses: ["中近距离一梭有弧线的重石", "瞄准落区压住会移动的目标", "对厚目标用巨岩式堆单块伤害"],
        kind: "aim",
        range: 7,
        maxRange: 12,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 28,
        maximumTicks: 260,
        style: "stone",
        defaults: { boulder: false, ai: { maxChase: 9, finish: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("rockblast", "reach", pokemon), geometry: "line", style: "stone", color: 0xA98C6A,
                label: config && config.boulder === true ? "巨岩式" : "碎岩霰弹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["rockblast"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("rockblast", "tempo", context)),
                recover: Math.round(p("rockblast", "aftercast", context)),
                cooldown: Math.round(p("rockblast", "recharge", context)),
                active: 0,
                range: p("rockblast", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const cap = config && config.boulder === true ? 3 : 5;
            const shots = Math.max(2, Math.min(cap, Math.round(p("rockblast", "shots", action))));
            action.present("rockblast:charge", rockblastScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", shots: shots, boulder: config && config.boulder === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p("rockblast", "shard", action);
            const cap = config && config.boulder === true ? 3 : 5;
            const shots = Math.max(2, Math.min(cap, Math.round(p("rockblast", "shots", action))));
            const gap = Math.max(2, Math.round(p("rockblast", "gap", action)));
            const speed = Math.max(0.5, p("rockblast", "velocity", action));
            const gravity = Math.max(0.01, p("rockblast", "arc", action));
            const radius = Math.max(0.15, p("rockblast", "radius", action));
            const spread = Math.max(1, p("rockblast", "spread", action));
            const chips = Math.max(6, Math.round(p("rockblast", "chips", action)));
            const settle = Math.max(24, Math.min(96, Math.round(p("rockblast", "rubble", action))));
            const reach = Math.max(1, p("rockblast", "reach", action));
            const boulder = !!(config && config.boulder);
            const material = rockblastGroundMaterial(rockblastSurface(world, action.origin()));
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.28));
            const intensity = Math.max(0.5, Math.min(2.0, power / 25));
            const scenes = WorldFeedback.actionScenes(rockblastScene);
            let shot = 0, settled = false;

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.finish(current, done); }

            /** 当刻落区：实体随其身体移动、点与方向保持选点；目标离场后释放旧锁，落区固定在实际 reach 内。
             *  之后的石块按冻结落点继续抛出，不为空放提前收招，也不让退远的目标把弹程追长。 */
            function landingPoint(current: CombatAction, origin: CombatPoint): CombatPoint {
                const watched = current.target();
                if (watched !== null && !current.world().valid(watched)) current.releaseTarget();
                let landing: CombatPoint | null = null;
                try { landing = current.targetPosition(); } catch (error) { landing = null; }
                if (landing === null || landing.minus(origin).length() < 0.05)
                    landing = origin.plus(current.direction().scale(reach));
                const delta = landing.minus(origin);
                if (delta.length() > reach) landing = origin.plus(delta.unit().scale(reach));
                return landing;
            }

            /** 抛出一块石头；它落地（撞人／撞块／耗尽）后按 gap 排下一块。每块各有独立 strike，重复回执仍去重。 */
            function volley(current: CombatAction): void {
                if (settled) return;
                if (shot >= shots) { finish(current); return; }
                const scope = current.world();
                const body = scope.observe(actor);
                const origin = body !== null ? body.position() : current.origin();
                const landing = landingPoint(current, origin);
                const distance = Math.max(1, landing.minus(origin).length());
                const ticks = Math.max(24, Math.round(distance / Math.max(0.3, speed)) + 30);
                // 低弧解直接给出真实弹道方向与弧长：range 用弧长而非直距，不再多给 +4 把弹程追远。
                const solutions = LivingActions.ballisticSolutions(origin, landing, speed, gravity, rockblastFlightTicks);
                let direction: CombatPoint, range: number, lifetime: number;
                if (solutions.length > 0) {
                    direction = solutions[0].direction;
                    range = Math.max(1.5, solutions[0].length + 0.6);
                    lifetime = Math.max(24, Math.ceil(solutions[0].ticks) + 20);
                } else {
                    direction = LivingActions.ballistic(origin, landing, speed, gravity) || aim(current);
                    range = Math.max(1.5, distance + 0.6);
                    lifetime = ticks;
                }
                direction = rockblastScatter(direction, (scope.random() * 2 - 1) * spread * Math.PI / 180);
                const index = shot + 1;
                shot = index;
                const key = "stone:" + index;
                const strike = "stone:" + index;
                const struck: { [ref: string]: boolean } = {};
                let resolved = false;
                sound(current, "cobblemon:move.rockthrow.actor");
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: range, radius: radius, direction: direction, gravity: gravity,
                    lifetime: lifetime,
                    appearance: { block: material, spin: true, scale: Math.max(0.4, Math.min(1.0, radius * 1.6)) } as any,
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        resolved = true;
                        scenes.stop(inner, key);
                        const stage = inner.world();
                        const struckEntity = hit.target();
                        const at = hit.position();
                        // 打到实体：只有真正结算成功才算「命中」，被拒时只崩一蓬更淡的石屑，不冒充命中。
                        if (struckEntity !== null && stage.valid(struckEntity) && !stage.friendly(struckEntity)) {
                            const ref = String(struckEntity.ref());
                            if (struck[ref]) return;
                            struck[ref] = true;
                            const landed = impact(inner, hit, "rockblast", power,
                                { damage: damageSpec("rockblast", "shard"), flags: { bullet: true } }, strike);
                            WorldFeedback.emit(stage, rockblastScene, 1, at,
                                { moment: landed ? "hit" : "ground", target: ref, shot: index, shots: shots,
                                    chips: landed ? chips : Math.round(chips * 0.5), scale: scale,
                                    intensity: landed ? intensity : Math.max(0.4, intensity * 0.7), settle: settle }, Math.max(20, settle));
                            if (landed) sound(inner, "cobblemon:impact.rock");
                            return;
                        }
                        // 打到方块：在真实接触点按碰撞面呈现撞点，不替换地表材质。
                        const data: any = { moment: "ground", shot: index, shots: shots, chips: Math.round(chips * 0.6),
                            scale: scale, intensity: Math.max(0.4, intensity * 0.7), settle: settle,
                            face: hit.blockFace(), blocked: hit.blocked() ? 1 : 0 };
                        const normal = rockblastFaceNormal(hit.blockFace());
                        if (normal !== null) data.direction = normal;
                        WorldFeedback.emit(stage, rockblastScene, 1, at, data, Math.max(20, settle));
                    }
                }, function (inner: CombatAction) {
                    if (!resolved) {
                        scenes.stop(inner, key);
                        // 空飞只读该弹完成回调内仍有效的真实末点淡出，不拿瞄准方向或满射程点假造终点。
                        const end = inner.world().projectilePosition(flight);
                        if (end !== null) WorldFeedback.emit(inner.world(), rockblastScene, 1, end,
                            { moment: "fade", shot: index, shots: shots, scale: scale, intensity: Math.max(0.3, intensity * 0.5) }, 14);
                    }
                    if (shot < shots) inner.after(gap, function (next: CombatAction) { volley(next); });
                    else finish(inner);
                });
                if (!settled) scenes.show(current, key, origin,
                    { moment: "volley", projectile: flight, shot: index, shots: shots, chips: chips, scale: scale,
                        intensity: intensity, boulder: boulder ? 1 : 0, material: material });
            }

            sound(action, "cobblemon:move.rockthrow.actor");
            WorldFeedback.emit(world, rockblastScene, 1, action.origin(),
                { moment: "charge", shots: shots, chips: chips, scale: scale, intensity: intensity, boulder: boulder ? 1 : 0 }, 16);
            volley(action);
        }
    });
}
