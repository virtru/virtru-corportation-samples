#!/bin/sh
# init-temporary-keys.sh

# This script was pulled directly from the virtru-corp/data-security-platform repo.
# Any issues with it might mean there was an underlying change in the DSP services, config, or containers
# and would be cause to verify this script is still valid. 
# It will hopefully be moved to a CLI command soon: [https://github.com/opentdf/platform/issues/841]

# Initialize temporary keys for use with a KAS

USAGE="Usage:  ${CMD:=${0##*/}} [(-v|--verbose)] [-H|--hsm]"

# helper functions
exit2() {
  printf >&2 "%s:  %s: '%s'\n%s\n" "$CMD" "$1" "$2" "$USAGE"
  exit 2
}
check() { { [ "$1" != "$EOL" ] && [ "$1" != '--' ]; } || exit2 "missing argument" "$2"; }

# parse command-line options
set -- "$@" "${EOL:=$(printf '\1\3\3\7')}" # end-of-list marker
while [ "$1" != "$EOL" ]; do
  opt="$1"
  shift
  case "$opt" in
    -H | --hsm) opt_hsm='true' ;;
    -v | --verbose) opt_verbose='true' ;;
    -h | --help)
      printf "%s\n" "$USAGE"
      exit 0
      ;;

    # process special cases
    -[A-Za-z0-9] | -*[!A-Za-z0-9]*) exit2 "invalid option" "$opt" ;;
  esac
done
shift

if [ "$opt_verbose" = true ]; then
  set -x
fi

if [ "$opt_hsm" = true ]; then
  : "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_PIN:=12345}"
  : "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_KEYS_EC_LABEL:=development-ec-kas}"
  : "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_KEYS_RSA_LABEL:=development-rsa-kas}"

  if [ -z "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_MODULEPATH}" ]; then
    if which brew; then
      OPENTDF_SERVER_CRYPTOPROVIDER_HSM_MODULEPATH=$(brew --prefix)/lib/softhsm/libsofthsm2.so
    else
      OPENTDF_SERVER_CRYPTOPROVIDER_HSM_MODULEPATH=/lib/softhsm/libsofthsm2.so
    fi
  fi

  if softhsm2-util --show-slots | grep dev-token; then
    echo "[INFO] dev-token slot is already configured"
    exit 0
  fi

  softhsm2-util --init-token --free --label "dev-token" --pin "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_PIN}" --so-pin "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_PIN}"
  pkcs11-tool --module "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_MODULEPATH}" --login --show-info --list-objects --pin "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_PIN}"
fi

mkdir -p dsp-keys/policyimportexport
# KAS keys
openssl req -x509 -nodes -newkey RSA:2048 -subj "/CN=kas" -keyout dsp-keys/kas-private.pem -out dsp-keys/kas-cert.pem -days 365
openssl ecparam -name prime256v1 > dsp-keys/ecparams.tmp
openssl req -x509 -nodes -newkey ec:dsp-keys/ecparams.tmp -subj "/CN=kas" -keyout dsp-keys/kas-ec-private.pem -out dsp-keys/kas-ec-cert.pem -days 365

# policyimportexport keys
echo "generating cosign keys for artifact signing with default password"
signingpassphrase="changeme"
export COSIGN_PASSWORD=$signingpassphrase
go run . cosign generate-key-pair
\printf "%s" "$signingpassphrase" > dsp-keys/policyimportexport/cosign.pass
mv cosign.pub dsp-keys/policyimportexport/cosign.pub 
mv cosign.key dsp-keys/policyimportexport/cosign.key

if [ "$opt_hsm" = true ]; then
  pkcs11-tool --module "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_MODULEPATH}" --login --pin "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_PIN}" --write-object kas-private.pem --type privkey --label "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_KEYS_RSA_LABEL}"
  pkcs11-tool --module "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_MODULEPATH}" --login --pin "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_PIN}" --write-object kas-cert.pem --type cert --label "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_KEYS_RSA_LABEL}"
  # https://manpages.ubuntu.com/manpages/jammy/man1/pkcs11-tool.1.html --usage-derive
  pkcs11-tool --module "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_MODULEPATH}" --login --pin "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_PIN}" --write-object kas-ec-private.pem --type privkey --label "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_KEYS_EC_LABEL}" --usage-derive
  pkcs11-tool --module "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_MODULEPATH}" --login --pin "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_PIN}" --write-object kas-ec-cert.pem --type cert --label "${OPENTDF_SERVER_CRYPTOPROVIDER_HSM_KEYS_EC_LABEL}"
fi
