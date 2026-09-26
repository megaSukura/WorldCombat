/**
 * 洁净光芒 / lusterpurge —— 注册与动作（重做）。
 *
 * 三幕：
 *   起（windup，提交前）：强光在身前收成一线，细亮芯沿瞄准方向预告（`action.present` 预告）。
 *   放（beam → hit/mark）：提交后光束先以窄芯存在，再由芯向两侧张开成有限光扇；张开途中每个落入光扇、
 *       且被 trace 确认视线直达的敌人最多各结算一次原主伤，各掷一次碾防（共享 `NativeEffects.boost(..., "spd", -1)`）。
 *   收（fade）：光扇打完收起，触发碾防的目标身上只留一记很短的亮点。
 *
 * 与同族分开：磨防四式里唯一朝前打出的定向光束；施法者不移动、不追踪（`stationary`、`turn: 0`），
 * 敌人能从束外绕开，墙面会截住光。配置 `focus`（聚光）由 resolve 改时序、由公式改张角／威力／概率／射程。
 */
namespace PokemonSkills {
    const lusterpurgeScene = "world_combat:move_lusterpurge";
    const lusterpurgeSunderText = "world_combat.move.lusterpurge.text.sunder";

    define({
        id: "lusterpurge",
        name: "Luster Purge",
        description: "朝瞄准方向打出一束短时强光：光先是一道细亮芯，随即由芯向两侧张开成有限光扇。光扇里、且光路没有被墙挡住的每个敌人各承受一次特殊伤害，并有很高概率被照得特防下降 1 级，触发时身上只留一记很短的亮点。施法者不移动、不追踪，敌人可以从束外绕开；墙面会截住光。",
        uses: ["朝正前方一次扫到成排的敌人", "用全族最高的概率压低前排对手的特防", "让甩到侧后方的敌人躲开这道光"],
        kind: "aim",
        range: 6.0,
        maxRange: 10.0,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 46,
        style: "radiance",
        stationary: true,
        turn: 0,
        defaults: { focus: false, ai: { maxChase: 8, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("lusterpurge", "beamLength", pokemon), geometry: "cone", style: "radiance",
                color: 0xFFE9A8, label: config && config.focus === true ? "聚光洁净光芒" : "洁净光芒" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["lusterpurge"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const focus = !!(config && config.focus);
            return {
                prepare: Math.round(p("lusterpurge", "tempo", context)),
                recover: 10,
                cooldown: 46 + (focus ? 4 : -2),
                active: 0,
                range: p("lusterpurge", "beamLength", context)
            };
        },
        windup: function (action, config, prepare) {
            // 预告细亮芯：与稍后 execute 的第一阶段同向、同长；只读 local 计算，随动作清理。
            const body = action.sense().observe(action.actor());
            const origin = body === null ? action.origin() : body.position();
            let direction = action.targetPosition().minus(origin);
            if (direction.length() < 0.05) direction = action.direction();
            direction = direction.length() < 0.02 ? action.direction() : direction.unit();
            const preview = p("lusterpurge", "beamLength", action.sense());
            const end = origin.plus(direction.scale(preview));
            action.present("world_combat:lusterpurge:" + action.id(), lusterpurgeScene, 1, origin,
                JSON.stringify({ moment: "windup", direction: [direction.x(), direction.y(), direction.z()],
                    path: [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]],
                    length: preview, focus: config && config.focus ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const length = Math.max(3, action.range());
            const power = p("lusterpurge", "core", action);
            const fanAngle = Math.max(8, p("lusterpurge", "fanAngle", action));
            const coreAngle = Math.max(2, Math.min(fanAngle, p("lusterpurge", "coreAngle", action)));
            const chance = p("lusterpurge", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("lusterpurge", "sunderStage", action)));
            const markTicks = Math.max(8, Math.round(p("lusterpurge", "markTicks", action)));
            const rays = Math.max(6, Math.round(p("lusterpurge", "rays", action)));
            const open = Math.max(1, Math.round(p("lusterpurge", "openTicks", action)));
            const scale = Math.max(0.6, Math.min(2.4, length / 6.0));
            const intensity = Math.max(0.6, Math.min(2.2, power / 90));
            const scenes = WorldFeedback.actionScenes(lusterpurgeScene);
            const hitRefs: { [ref: string]: boolean } = Object.create(null);
            let direction = action.targetPosition().minus(origin);
            if (direction.length() < 0.05) direction = action.direction();
            direction = direction.length() < 0.02 ? action.direction() : direction.unit();
            action.releaseTarget();
            const dir = [direction.x(), direction.y(), direction.z()];
            const end = origin.plus(direction.scale(length));
            const path = [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]];
            let step = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                WorldFeedback.emit(current.world(), lusterpurgeScene, 1, origin,
                    { moment: "fade", direction: dir, angle: fanAngle, length: length, rays: rays, scale: scale, intensity: intensity }, 24);
                scenes.finish(current, done);
            }

            /** 光只能打到光线没被墙或挡在前面的身体截住的人：从源点向该目标 trace，首个接触要正是它。 */
            function lit(current: CombatAction, point: CombatPoint, ref: string): boolean {
                const hit = current.trace(origin, point, 0.28, true);
                if (hit.hitEntity()) {
                    const first = hit.target();
                    return first !== null && String(first.ref()) === ref;
                }
                return !hit.blocked();
            }

            function strike(current: CombatAction): void {
                const scope = current.world();
                const opened = (step + 1) / open;
                const angle = coreAngle + (fanAngle - coreAngle) * opened;
                const flat = WorldGeometry.flatUnit(direction), side = WorldCombat.point(-flat.z(), 0, flat.x());
                const normal = WorldCombat.point(direction.y()*side.z(), direction.z()*side.x()-direction.x()*side.z(), -direction.y()*side.x()).unit();
                const vertices: CombatPoint[] = [origin], pieces: WorldGeometry.BodyRegion[] = [];
                const samples = 12, half = angle * Math.PI / 360;
                let previous: CombatPoint | null = null;
                for(let i=0;i<=samples;i++) {
                    const theta = -half + 2*half*i/samples;
                    const ray = direction.scale(Math.cos(theta)).plus(side.scale(Math.sin(theta)));
                    const clip = scope.clipBlocks(origin, origin.plus(ray.scale(length)));
                    const edge = clip === null ? origin : clip.blocked() ? clip.position() : origin.plus(ray.scale(length));
                    vertices.push(edge);
                    if(previous && previous.minus(origin).length()>.001 && edge.minus(origin).length()>.001)
                        pieces.push(WorldGeometry.bodyPrism([origin,previous,edge],normal,.28));
                    previous=edge;
                }
                const core = scope.clipBlocks(origin, end), coreEnd = core === null ? origin : core.blocked() ? core.position() : end;
                scenes.show(current, "core", origin, { moment: "core", path: [[origin.x(),origin.y(),origin.z()],[coreEnd.x(),coreEnd.y(),coreEnd.z()]], intensity: intensity });
                scenes.show(current, "beam", origin,
                    { moment: "beam", direction: dir, angle: angle, length: length,
                        path: vertices.map(point=>[point.x(),point.y(),point.z()]),
                        rays: rays, scale: scale, intensity: intensity, opening: step < open - 1 ? 1 : 0 });
                const extent=WorldCombat.point(length+.28,length+.28,length+.28);
                const region: WorldGeometry.BodyRegion = { boundsMin:()=>origin.minus(extent),boundsMax:()=>origin.plus(extent),
                    intersects:(min,max)=>pieces.some(piece=>piece.intersects(min,max)) };
                WorldGeometry.selectBodies(scope, region,
                    function (enemy: CombatActor, facts: CombatObservation) {
                        if(scope.friendly(enemy))return;
                        const ref = String(enemy.ref());
                        if (ref === String(actor.ref()) || hitRefs[ref]) return;
                        const point = scope.closestPoint(enemy, origin);
                        if (point === null || !lit(current, point, ref)) return;
                        hitRefs[ref] = true;
                        if (!hurt(current, enemy, "lusterpurge", power, { damage: damageSpec("lusterpurge", "core") })) return;
                        WorldFeedback.emit(scope, lusterpurgeScene, 1, point,
                            { moment: "hit", target: ref, rays: rays, scale: scale, intensity: Math.max(0.5, Math.min(2.2, power / 90)) }, 20);
                        if (scope.valid(enemy) && scope.random() < chance) {
                            const applied = NativeEffects.boost(scope, enemy, "spd", -stages);
                            if (applied !== 0) {
                                const at = scope.observe(enemy);
                                if (at !== null) {
                                    WorldFeedback.keep(scope, "lusterpurge:mark:" + ref, lusterpurgeScene, 1, at.position(),
                                        { moment: "mark", target: ref, rays: rays, scale: scale, ticks: markTicks }, markTicks);
                                    WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)), lusterpurgeSunderText, [stages], 30);
                                }
                            }
                        }
                    });
                step++;
                if (step >= open) { finish(current); return; }
                current.after(1, strike);
            }

            sound(action, "minecraft:block.beacon.activate");
            strike(action);
        }
    });
}
