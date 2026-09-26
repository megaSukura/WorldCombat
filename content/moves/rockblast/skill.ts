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
 * 配置 `boulder`（巨岩式）由公式改威力／投石数／散布／弧坠与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const rockblastScene = "world_combat:move_rockblast";

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

    /** 读施法者脚下最近的一层实心方块，作为这一梭石头的材质来源。 */
    function rockblastSurface(world: CombatWorld, at: CombatPoint): string {
        for (let dy = 1; dy >= -3; dy--) {
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

    define({
        id: "rockblast",
        cooldownParameter: "recharge",
        name: "Rock Blast",
        description: "从脚下的地里掰出石块，一块接一块按弧线抛向瞄准的落区：每块真正砸中才结算一次，并在真撞点崩起碎石尘。石块抛得散、贴脸才吃得满；可瞄实体、地面点或抬高的方向，墙会把石头真的截下来。巨岩式少而重、抛得更紧更陡。",
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
            const shots = Math.max(2, Math.min(5, Math.round(p("rockblast", "shots", action))));
            action.present("rockblast:charge", rockblastScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", shots: shots, boulder: config && config.boulder === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p("rockblast", "shard", action);
            const shots = Math.max(2, Math.min(5, Math.round(p("rockblast", "shots", action))));
            const gap = Math.max(2, Math.round(p("rockblast", "gap", action)));
            const speed = Math.max(0.5, p("rockblast", "velocity", action));
            const gravity = Math.max(0.01, p("rockblast", "arc", action));
            const radius = Math.max(0.15, p("rockblast", "radius", action));
            const spread = Math.max(1, p("rockblast", "spread", action));
            const chips = Math.max(6, Math.round(p("rockblast", "chips", action)));
            const settle = Math.max(24, Math.min(96, Math.round(p("rockblast", "rubble", action))));
            const boulder = !!(config && config.boulder);
            const material = rockblastGroundMaterial(rockblastSurface(world, action.origin()));
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.28));
            const intensity = Math.max(0.5, Math.min(2.0, power / 25));
            const scenes = WorldFeedback.actionScenes(rockblastScene);
            let shot = 0, settled = false;

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.finish(current, done); }

            /** 当刻落区：实体随其身体移动、点与方向保持选点；无有效射点时回退到准线。 */
            function landingPoint(current: CombatAction, origin: CombatPoint): CombatPoint {
                let landing: CombatPoint;
                try { landing = current.targetPosition(); } catch (error) { landing = origin.plus(current.direction().scale(Math.max(1, current.range()))); }
                if (landing.minus(origin).length() < 0.05) landing = origin.plus(current.direction().scale(Math.max(1, current.range())));
                return landing;
            }

            /** 抛出一块石头；它落地（撞人／撞块／耗尽）后按间隔排下一块。 */
            function volley(current: CombatAction): void {
                if (settled) return;
                if (shot >= shots) { finish(current); return; }
                const scope = current.world();
                const body = scope.observe(actor);
                const origin = body !== null ? body.position() : current.origin();
                const landing = landingPoint(current, origin);
                let direction = LivingActions.ballistic(origin, landing, speed, gravity);
                if (direction === null) direction = aim(current);
                direction = rockblastScatter(direction, (scope.random() * 2 - 1) * spread * Math.PI / 180);
                const distance = Math.max(1, landing.minus(origin).length());
                const index = shot + 1;
                shot = index;
                const key = "stone:" + index;
                let resolved = false;
                sound(current, "cobblemon:move.rockthrow.actor");
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: distance + 4, radius: radius, direction: direction, gravity: gravity,
                    lifetime: Math.max(24, Math.round(distance / Math.max(0.3, speed)) + 30),
                    appearance: { block: material, spin: true, scale: Math.max(0.4, Math.min(1.0, radius * 1.6)) } as any,
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        resolved = true;
                        scenes.stop(inner, key);
                        const stage = inner.world();
                        const struck = hit.target();
                        const at = hit.position();
                        // 打到实体：只有真正结算成功才算「命中」，被拒时只崩一蓬更淡的石屑，不冒充命中。
                        if (struck !== null && stage.valid(struck) && !stage.friendly(struck)) {
                            const landed = impact(inner, hit, "rockblast", power, { damage: damageSpec("rockblast", "shard"), flags: { bullet: true } });
                            WorldFeedback.emit(stage, rockblastScene, 1, at,
                                { moment: landed ? "hit" : "ground", target: String(struck.ref()), shot: index, shots: shots,
                                    chips: landed ? chips : Math.round(chips * 0.5), scale: scale,
                                    intensity: landed ? intensity : Math.max(0.4, intensity * 0.7), settle: settle }, Math.max(20, settle));
                            if (landed) sound(inner, "cobblemon:impact.rock");
                            return;
                        }
                        // 打到方块：用原生方块格与表面呈现真实撞点，不替换地表材质。
                        const cell = hit.blockPosition();
                        const ground = cell === null ? at : cell;
                        WorldFeedback.emit(stage, rockblastScene, 1, ground,
                            { moment: "ground", shot: index, shots: shots, chips: Math.round(chips * 0.6), scale: scale,
                                intensity: Math.max(0.4, intensity * 0.7), settle: settle,
                                face: hit.blockFace(), blocked: hit.blocked() ? 1 : 0 }, Math.max(20, settle));
                    }
                }, function (inner: CombatAction) {
                    if (!resolved) {
                        scenes.stop(inner, key);
                        // 空飞耗尽：只淡出，不留碎石、不改地表。
                        WorldFeedback.emit(inner.world(), rockblastScene, 1, origin.plus(direction.scale(distance)),
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
