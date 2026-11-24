production_memory_gate_decision() {
  local mode="${1:-}" production_running="${2:-}"
  case "$mode:$production_running" in
    deploy:false) printf 'enforce\n' ;;
    deploy:true) printf 'skip\n' ;;
    *) return 64 ;;
  esac
}
