#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Wed Dec 21 18:16:18 2022

@author: ananyasridhar
"""

from .commons import download_data

""" download the latest policy stringency data from the Oxford tracker """

URL      = "https://raw.githubusercontent.com/OxCGRT/covid-policy-tracker/master/data/"
filename = "OxCGRT_latest.csv"

def download_latest_stringency(dest):
    download_data(dest, filename, base_url = URL)