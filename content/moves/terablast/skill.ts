/**
 * 太晶爆发 / terablast —— 注册与动作。
 *
 * 形态由物攻/特攻之比决定（`edge`）：物攻更高凝成晶矛，特攻更高放出晶束。两者都由 parameters.ts
 * 的同一段伤害 resolve 决定属性与分类，预览与命中走同一份。
 *
 *   - 晶矛（ram）：一条投出的厚重单发晶弹，沿瞄准方向飞出，撞上第一个实体即碎并把目标顶开；
 *     撞墙则在墙面熄灭（fizzle）。
 *   - 晶束（beam）：一条固定方向的窄线从身前逐段推进，线头每刻前进 `beamSpeed` 格，扫过的敌人
 *     各只结算一次总威力；线头被方块挡住就停在墙面。判定、线宽与画出的线段读同一组端点。
 *
 * kind 为 aim：AI 可为攻击用途推荐实体（宿主把实体与落点一起交给动作），玩家也可直接瞄方向/点空放；
 * 攻击权限依旧由命中层（hurt 的非友方判定）控制。世界不留持久物：晶体命中即碎。
 */
namespace PokemonSkills {
    const TERABLAST_SCENE = "world_combat:move_terablast";

    function terablastLaunch(action: CombatAction): any {
        var raw = action.data("world_combat:terablast/launch");
        if (raw === null) return null;
        try { return JSON.parse(raw); } catch (error) { return null; }
    }

    /** The release-time snapshot is authoritative for this cast; the edge formula only covers the windup telegraph. */
    function terablastForm(action: CombatAction): string {
        var launch = terablastLaunch(action);
        if (launch && (launch.category === "physical" || launch.category === "special")) return launch.category === "physical" ? "ram" : "beam";
        return p("terablast", "edge", action) > 0 ? "ram" : "beam";
    }

    /** Effective type (temporary layers included), the lowercase id the client maps through the shared type colour table. */
    function terablastType(action: CombatAction): string {
        var launch = terablastLaunch(action);
        if (launch && typeof launch.type === "string" && launch.type) return launch.type;
        var world = action.sense();
        return world.valid(action.actor()) ? terablastEffectiveType(world, action.actor()) : "";
    }

    /** Release-time type, strong-side category, staged attack and STAB are frozen together so every hit settles the same. */
    function terablastSnapshot(action: CombatAction): void {
        var world = action.world(), actor = action.actor();
        if (!world.valid(actor)) return;
        var type = terablastEffectiveType(world, actor);
        if (!type) return;
        var facts = PokemonDamage.combatants.read(world, actor);
        var atk = PokemonDamage.snapshotAttack(world, actor, "atk"), spa = PokemonDamage.snapshotAttack(world, actor, "spa");
        var physical = atk.value * NativeEffects.multiplier(atk.stage) > spa.value * NativeEffects.multiplier(spa.stage);
        action.data("world_combat:terablast/launch", JSON.stringify({
            type: type, category: physical ? "physical" : "special",
            attack: physical ? atk : spa, sameType: PokemonDamage.sameType(facts, type)
        }));
    }

    function terablastPoint(point: CombatPoint): number[] {
        return [point.x(), point.y(), point.z()];
    }

    function terablastRam(action: CombatAction, power: number, done: (current: CombatAction) => void): void {
        var world = action.world(),
            direction = aim(action),
            speed = p("terablast", "ramSpeed", action),
            radius = p("terablast", "collisionRadius", action),
            scale = Math.max(0.8, Math.min(1.6, radius / 0.30));
        sound(action, "minecraft:block.amethyst_block.chime");
        var flight = LivingActions.projectile(action, {
            speed: speed, range: action.range(), radius: radius, direction: direction,
            appearance: { sprite: "cobblemon:generic/ice/iceshard", scale: 1.5 + scale * 0.3, glow: true },
            impact: function (current: CombatAction, hit: CombatImpact) { terablastImpact(current, hit, power, direction, scale); }
        }, done);
        WorldFeedback.emit(world, TERABLAST_SCENE, 1, action.origin(),
            { moment: "ram", projectile: flight, intensity: 1, scale: scale, spear: 3.2, form: "ram", type: terablastType(action) }, 80);
    }

    function terablastImpact(current: CombatAction, hit: CombatImpact, power: number, direction: CombatPoint, scale: number): void {
        var world = current.world(), target = hit.target(), point = hit.position();
        if (target === null) {
            WorldFeedback.emit(world, TERABLAST_SCENE, 1, point, { moment: "fizzle", intensity: 1, scale: scale }, 30);
            return;
        }
        var body = world.observe(target), before = body ? body.health() : 0, maximum = body ? Math.max(1, body.maxHealth()) : 1;
        var landed = impact(current, hit, "terablast", power, {});
        var after = world.valid(target) ? world.observe(target) : null, dealt = before - (after ? after.health() : 0);
        var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
        world.sound("minecraft:block.amethyst_cluster.break", point, 16, "{}");
        WorldFeedback.emit(world, TERABLAST_SCENE, 1, point,
            { moment: "impact", target: String(target.ref()), intensity: intensity, scale: scale, type: terablastType(current),
                bursts: Math.round(6 + intensity * 8), cover: 0.9 + intensity * 0.35 }, 40);
        WorldFeedback.text(world, point, "world_combat.move.terablast.text.ram", [], 40);
        if (landed && world.valid(target))
            world.hitDisplace(target, direction.scale(p("terablast", "push", current)));
    }

    /** Exact wall end from the native block-only clip; a clear line returns the full range. */
    function terablastBeamEndDistance(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, limit: number): { end: number; wall: CombatImpact | null } {
        var wall = WorldGeometry.blockHit(world, origin, origin.plus(direction.scale(limit)));
        if (wall === null) return { end: limit, wall: null };
        var delta = wall.position().minus(origin);
        var along = delta.x() * direction.x() + delta.y() * direction.y() + delta.z() * direction.z();
        return { end: Math.max(0, Math.min(limit, along)), wall: wall };
    }

    function terablastBeam(action: CombatAction, power: number, done: (current: CombatAction) => void): void {
        var world = action.world(), origin = action.origin(), direction = aim(action),
            width = p("terablast", "beamWidth", action),
            speed = p("terablast", "beamSpeed", action),
            limit = action.range(),
            type = terablastType(action);
        sound(action, "minecraft:block.amethyst_block.chime");
        var reach = terablastBeamEndDistance(world, origin, direction, limit), end = reach.end;
        var scenes = WorldFeedback.actionScenes(TERABLAST_SCENE);
        var hitRefs: { [ref: string]: boolean } = {}, hits = 0, best = 0, tip = 0;
        var path: number[][] = [terablastPoint(origin)];
        function beamData(at: number): any {
            return { moment: "beam", path: path, point: terablastPoint(origin.plus(direction.scale(at))),
                direction: terablastPoint(direction), intensity: 1, scale: Math.max(0.7, Math.min(2.2, width / 0.16)),
                form: "beam", type: type };
        }
        scenes.show(action, "beam", origin, beamData(0));
        function advance(current: CombatAction): void {
            var scope = current.world();
            var from = tip, to = Math.min(end, tip + speed);
            if (to > from + 0.001) {
                WorldGeometry.selectBodies(scope, WorldGeometry.bodySegment(origin.plus(direction.scale(from)), origin.plus(direction.scale(to)), width),
                    function (enemy: CombatActor, facts: CombatObservation) {
                        var ref = String(enemy.ref());
                        if (scope.friendly(enemy) || ref === String(current.actor().ref()) || hitRefs[ref] || !scope.clear(origin, facts.position()))
                            return;
                        hitRefs[ref] = true;
                        var body = scope.observe(enemy), before = body ? body.health() : 0, maximum = body ? Math.max(1, body.maxHealth()) : 1;
                        if (!hurt(current, enemy, "terablast", power, {}))
                            return;
                        var after = scope.valid(enemy) ? scope.observe(enemy) : null, ratio = (before - (after ? after.health() : 0)) / maximum;
                        hits++;
                        best = Math.max(best, ratio);
                        // 每个真实受击体在自己的位置短闪，不再把成功爆裂挪到射程末端。
                        WorldFeedback.emit(scope, TERABLAST_SCENE, 1, facts.position(),
                            { moment: "beam_hit", target: ref, intensity: Math.max(1, Math.min(3, 1 + ratio * 4)),
                                scale: Math.max(0.7, Math.min(2.2, width / 0.16)), type: type }, 24);
                    });
            }
            tip = to;
            path.push(terablastPoint(origin.plus(direction.scale(tip))));
            scenes.show(current, "beam", origin, beamData(tip));
            if (tip >= end - 0.001) {
                // 末端只有真实墙接触才破裂；铺到满射程只是自然消散。
                if (reach.wall !== null)
                    terablastBeamWall(current, reach.wall.position(), hits, best, type);
                scenes.finish(current, done);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    function terablastBeamWall(current: CombatAction, endpoint: CombatPoint, hits: number, best: number, type: string): void {
        var world = current.world();
        var intensity = Math.max(1, Math.min(3, 1 + best * 4));
        world.sound("minecraft:block.amethyst_cluster.break", endpoint, 16, "{}");
        WorldFeedback.emit(world, TERABLAST_SCENE, 1, endpoint,
            { moment: "beam_impact", point: terablastPoint(endpoint), intensity: intensity, scale: 1, type: type,
                bursts: Math.round(6 + intensity * 8), cover: 0.9 + intensity * 0.35, truncated: 1 }, 40);
        if (hits > 0) WorldFeedback.text(world, endpoint, "world_combat.move.terablast.text.beam", [], 40);
    }

    function terablastStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        var power = p("terablast", "power", action);
        if (terablastForm(action) === "ram")
            terablastRam(action, power, done);
        else
            terablastBeam(action, power, done);
    }

    define({ id: "terablast", name: "太晶爆发",
        description: "凝出自身主属性的太晶：物攻更高就投出一支厚重晶矛，撞上第一个目标即碎、把它顶开；特攻更高就放出一条固定方向的窄晶束，逐段推进，线内每个敌人各只挨一次总威力，遇到方块停在墙面。属性和强弱面在释放那一刻定下。",
        uses: ["远程爆发", "看家本领"], kind: "aim", range: 18, prepare: 8, active: 0, recover: 8, cooldown: 40, style: "tera",
        defaults: {}, fields: [],
        indicator: function () { return { radius: 18, geometry: "line", style: "tera", label: "太晶爆发" }; },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            action.present("world_combat:terablast:" + action.id(), TERABLAST_SCENE, 1, action.origin(),
                JSON.stringify({ moment: "windup", form: terablastForm(action), type: terablastType(action) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            terablastSnapshot(action);
            terablastStrike(action, done);
        }
    });
}
